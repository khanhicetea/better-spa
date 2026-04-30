import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Users2 } from "lucide-react";
import type { ComponentType } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      orpc.user.list.queryOptions({ input: { page: 1 } }),
    );
  },
});

function AdminOverviewPage() {
  const { data: usersPage } = useSuspenseQuery(
    orpc.user.list.queryOptions({ input: { page: 1 } }),
  );

  return (
    <div className="space-y-4 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">
          Quick health check for users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={Users2}
          label="Total users"
          value={String(usersPage.totalCount)}
          description={`${usersPage.users.length} users loaded on page 1`}
        />
        <MetricCard
          icon={Shield}
          label="Admins on page"
          value={String(
            usersPage.users.filter((user) => user.role === "admin").length,
          )}
          description="Based on the current paginated users view"
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
