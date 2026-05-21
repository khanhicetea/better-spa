import { baseProcedure } from "../base";

function readCookie(headers: Headers, name: string): string | undefined {
  const raw = headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export const shellData = baseProcedure.handler(async ({ context }) => {
  return {
    app: {
      name: "Better SPA",
      version: "1.0.0",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      theme: readCookie(context.headers, "theme") || "system",
    },
  };
});
