import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { DefaultCatchBoundary } from "@/components/shell/default-catch-boundary";
import { ShellProgressBar } from "@/components/shell/shell-progress-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { bootstrapQueryOptions } from "@/lib/queries";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  errorComponent: DefaultCatchBoundary,
  beforeLoad: async ({ context }) => {
    const { user } = await context.queryClient.ensureQueryData(bootstrapQueryOptions());

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (user.role !== "admin") {
      throw redirect({ to: "/app" });
    }

    return { user };
  },
  ssr: "data-only",
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
      <ShellProgressBar />
    </SidebarProvider>
  );
}
