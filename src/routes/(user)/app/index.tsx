import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(user)/app/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/todo" });
  },
});
