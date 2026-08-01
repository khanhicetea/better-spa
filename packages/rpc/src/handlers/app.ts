import { baseProcedure } from "../base";
import { bootstrapSchema, toSelfUser } from "../dto";

function readCookie(headers: Headers, name: string): string | undefined {
  const raw = headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function readTheme(headers: Headers): "light" | "dark" | "system" {
  const value = readCookie(headers, "theme");
  return value === "light" || value === "dark" ? value : "system";
}

export const bootstrap = baseProcedure.output(bootstrapSchema).handler(async ({ context }) => {
  const sessionUser = context.session?.user;
  const userRow = sessionUser ? await context.repos.user.findById(sessionUser.id) : undefined;
  const user = userRow ? toSelfUser(userRow) : null;

  return {
    app: {
      name: "KitKit",
      version: context.appVersion,
      environment: context.environment,
      runtime: context.runtime,
    },
    user,
    preferences: {
      theme: readTheme(context.headers),
      timezone: user?.timezone ?? "UTC",
    },
    capabilities: {
      oauthProviders: context.oauthProviders,
      uploads: context.storage !== null,
    },
  };
});
