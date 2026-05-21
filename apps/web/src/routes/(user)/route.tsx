import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authQueryOptions } from "@/lib/queries";
import { DefaultCatchBoundary } from "@/components/spa/default-catch-boundary";
import { ShellProgressBar } from "@/components/spa/shell-progress-bar";

export const Route = createFileRoute("/(user)")({
  component: UserLayout,
  errorComponent: DefaultCatchBoundary,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());

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
