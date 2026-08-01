import handler from "@tanstack/react-start/server-entry";
import { createWorkerDatabaseResource } from "@kitkit/db/client";
import { createRepos } from "@kitkit/db/repositories";
import { getAuthConfig } from "@kitkit/auth/server";
import { createRequestContext, requestStorage } from "@kitkit/rpc/context";
import { ingressRateLimitService } from "@kitkit/rpc/rate-limiter";
import { createS3StorageSigner } from "@kitkit/rpc/storage";
import { evlogRedactConfig, runWithLogContext } from "@kitkit/observability";
import { createWorkersLogger, initWorkersLogger } from "evlog/workers";
import webPackage from "../../package.json";

initWorkersLogger({
  env: {
    service: "kitkit-web",
    environment: "production",
    version: webPackage.version,
  },
  redact: evlogRedactConfig,
});

function optionalSecret(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const path = new URL(request.url).pathname;
    const isRpcRequest = path === "/api/rpc" || path.startsWith("/api/rpc/");
    const requestLog = createWorkersLogger(request, { executionCtx: ctx, requestId });
    requestLog.set({ runtime: "cloudflare" });

    return runWithLogContext({ requestId, runtime: "cloudflare", path }, async () => {
      const startedAt = Date.now();
      const database = await createWorkerDatabaseResource(env.HYPERDRIVE.connectionString);
      const { db } = database;
      const repos = createRepos(db);
      const oauthProviders: Array<"github" | "google"> = [];
      const githubId = optionalSecret("GITHUB_CLIENT_ID");
      const githubSecret = optionalSecret("GITHUB_CLIENT_SECRET");
      const googleId = optionalSecret("GOOGLE_CLIENT_ID");
      const googleSecret = optionalSecret("GOOGLE_CLIENT_SECRET");
      if (githubId && githubSecret) oauthProviders.push("github");
      if (googleId && googleSecret) oauthProviders.push("google");

      const auth = getAuthConfig({
        db,
        baseURL: optionalSecret("VITE_BASE_URL"),
        socialProviders: {
          ...(githubId && githubSecret
            ? { github: { clientId: githubId, clientSecret: githubSecret } }
            : {}),
          ...(googleId && googleSecret
            ? { google: { clientId: googleId, clientSecret: googleSecret } }
            : {}),
        },
      });
      const s3Endpoint = optionalSecret("S3_ENDPOINT");
      const s3AccessKeyId = optionalSecret("S3_ACCESS_KEY_ID");
      const s3SecretAccessKey = optionalSecret("S3_SECRET_ACCESS_KEY");
      const s3Bucket = optionalSecret("S3_BUCKET_NAME");
      const storage =
        s3Endpoint && s3AccessKeyId && s3SecretAccessKey && s3Bucket
          ? createS3StorageSigner({
              endpoint: s3Endpoint,
              accessKeyId: s3AccessKeyId,
              secretAccessKey: s3SecretAccessKey,
              bucket: s3Bucket,
              region: optionalSecret("S3_REGION") ?? "auto",
            })
          : null;

      try {
        const session = await auth.api.getSession({ headers: request.headers });
        const context = createRequestContext({
          requestId,
          headers: request.headers,
          auth,
          session,
          db,
          repos,
          storage,
          rateLimit: ingressRateLimitService,
          waitUntil: (promise) => ctx.waitUntil(promise),
          runtime: "cloudflare",
          environment: "production",
          appVersion: webPackage.version,
          oauthProviders,
          clientIp: request.headers.get("cf-connecting-ip") ?? "unknown",
        });

        return await requestStorage.run(context, async () => {
          const instrumentedHeaders = new Headers(request.headers);
          instrumentedHeaders.set("x-request-id", requestId);
          const instrumentedRequest = new Request(request, { headers: instrumentedHeaders });
          const response = await handler.fetch(instrumentedRequest, { context: undefined });
          const headers = new Headers(response.headers);
          headers.set("x-request-id", requestId);
          if (!isRpcRequest) requestLog.emit({ status: response.status });
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        });
      } catch (error) {
        requestLog.error(error instanceof Error ? error : String(error));
        requestLog.emit({ status: 500, duration: Date.now() - startedAt });
        return new Response("Internal Server Error", {
          status: 500,
          headers: { "x-request-id": requestId },
        });
      } finally {
        await database.close();
      }
    });
  },
} satisfies ExportedHandler<Env>;
