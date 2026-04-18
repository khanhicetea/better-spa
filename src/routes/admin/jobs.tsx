import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, RefreshCw } from "lucide-react";
import { PagePending } from "@/components/common/page-pending";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getJobsRefetchInterval } from "@/lib/jobs/status";
import { orpc } from "@/lib/orpc";
import { JobCard } from "./-jobs/job-card";

export const Route = createFileRoute("/admin/jobs")({
  component: JobsPage,
  pendingComponent: PagePending,
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      orpc.job.listAdmin.queryOptions({
        input: { limit: 100 },
      }),
    );
  },
});

function JobsPage() {
  const { data: jobs, refetch } = useSuspenseQuery(
    orpc.job.listAdmin.queryOptions({
      input: { limit: 100 },
      refetchInterval: (query) => getJobsRefetchInterval(query.state.data),
    }),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Background Jobs
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor queued and running worker jobs.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {!jobs || jobs.length === 0 ? (
          <Empty className="rounded-xl border py-20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>No jobs yet</EmptyTitle>
              <EmptyDescription>
                Queue a task from the app to see worker status here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onUpdated={() => refetch()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
