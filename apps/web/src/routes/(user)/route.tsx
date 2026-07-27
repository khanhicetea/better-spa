import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { bootstrapQueryOptions } from "@/lib/queries";
import { DefaultCatchBoundary } from "@/components/shell/default-catch-boundary";
import { ShellProgressBar } from "@/components/shell/shell-progress-bar";

export const Route = createFileRoute("/(user)")({
  component: UserLayout,
  errorComponent: DefaultCatchBoundary,
  beforeLoad: async ({ context }) => {
    const { user } = await context.queryClient.ensureQueryData(bootstrapQueryOptions());

    if (!user) {
      throw redirect({ to: "/login" });
    }

    // re-return to update type as non-null for child routes
    return { user };
  },
});

function UserLayout() {
  return (
    <>
      <Outlet />
      <ShellProgressBar />
    </>
  );
}
