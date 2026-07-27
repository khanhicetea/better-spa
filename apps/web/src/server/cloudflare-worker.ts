import handler from "@tanstack/react-start/server-entry";
import { getDatabasePooling } from "@better-spa/db/client";
import { createRepos } from "@better-spa/db/repositories";
import { getAuthConfig } from "@better-spa/auth/server";
import { createRequestContext, requestStorage } from "@better-spa/rpc/context";
import { ingressRateLimitService } from "@better-spa/rpc/rate-limiter";
import { createS3StorageSigner } from "@better-spa/rpc/storage";
import { logger, runWithLogContext } from "@better-spa/observability";
import webPackage from "../../package.json";

function optionalSecret(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const path = new URL(request.url).pathname;

    return runWithLogContext({ requestId, runtime: "cloudflare", path }, async () => {
      const startedAt = Date.now();
      const db = getDatabasePooling(env.HYPERDRIVE.connectionString);
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
          const response = await handler.fetch(request, { context: undefined });
          const headers = new Headers(response.headers);
          headers.set("x-request-id", requestId);
          logger.info("HTTP request completed", {
            method: request.method,
            durationMs: Date.now() - startedAt,
            resultClass: `${Math.floor(response.status / 100)}xx`,
          });
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        });
      } catch (error) {
        logger.error("Worker request failed", {
          error,
          method: request.method,
          durationMs: Date.now() - startedAt,
          resultClass: "5xx",
        });
        return new Response("Internal Server Error", {
          status: 500,
          headers: { "x-request-id": requestId },
        });
      } finally {
        await db.destroy();
      }
    });
  },
} satisfies ExportedHandler<Env>;
