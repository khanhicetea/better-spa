import { getCookie } from "@tanstack/react-start/server";
import { baseProcedure } from "../base";

export const shellData = baseProcedure.handler(async ({ context }) => {
  return {
    app: {
      name: "Better SPA",
      version: "1.0.0",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      theme: getCookie("theme") || "system",
    },
  };
});
