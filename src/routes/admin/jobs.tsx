import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { PagePending } from "@/components/common/page-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress, ProgressValue } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserJobs } from "@/lib/hooks/jobs";
import { orpc } from "@/lib/orpc";
import { formatRelativeTime } from "@/lib/utils/date";
import type { Outputs } from "@/rpc/types";

export const Route = createFileRoute("/admin/jobs")({
  component: JobsPage,
  pendingComponent: PagePending,
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      orpc.job.listAllJobs.queryOptions({
        input: { limit: 100 },
      }),
    );
  },
});

type Job = Outputs["job"]["listJobs"][number];

function JobsPage() {
  const {
    data: jobs,
    isLoading,
    refetch,
  } = useSuspenseQuery(
    orpc.job.listAllJobs.queryOptions({
      input: { limit: 100 },
      refetchInterval: (query) => {
        // Stop polling if all jobs are in terminal states
        const jobs = query.state.data;
        if (!jobs || jobs.length === 0) return 1000;

        const hasActiveJobs = jobs.some(
          (job) => job.status === "pending" || job.status === "processing",
        );

        return hasActiveJobs ? 1000 : 5000;
      },
    }),
  );

  if (isLoading) {
    return <PagePending />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Background Jobs
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor your running tasks and exports
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Jobs List */}
        {!jobs || jobs.length === 0 ? (
          <Empty className="py-20 border rounded-xl">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>No jobs yet</EmptyTitle>
              <EmptyDescription>
                When you start a background task, it will appear here.
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

function JobCard({ job, onUpdated }: { job: Job; onUpdated: () => void }) {
  const cancelMutation = useMutation(
    orpc.job.cancelJob.mutationOptions({
      onSuccess: () => {
        onUpdated();
      },
    }),
  );

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Pending",
      animate: false,
    },
    processing: {
      icon: Loader2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Processing",
      animate: true,
    },
    completed: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      label: "Completed",
      animate: false,
    },
    failed: {
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      label: "Failed",
      animate: false,
    },
    cancelled: {
      icon: X,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Cancelled",
      animate: false,
    },
  };

  const config =
    statusConfig[job.status as keyof typeof statusConfig] ||
    statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card className="transition-all hover:shadow-md">
      <div className="flex items-center gap-3 p-2 py-1">
        <div className={`p-1.5 rounded-lg ${config.bgColor} shrink-0`}>
          <StatusIcon
            className={`h-4 w-4 ${config.color} ${config.animate ? "animate-spin" : ""}`}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium truncate flex flex-col gap-1">
              <span>{job.label}</span>
              <Badge>UserID : {job.userId}</Badge>
            </CardTitle>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeTime(job.createdAt)}
            </span>
          </div>
          {(job.status === "processing" ||
            (job.status === "completed" && job.progress < 100)) && (
            <Progress value={job.progress} className="h-1" />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {job.error && (
            <Tooltip>
              <TooltipTrigger
                render={<AlertCircle className="h-4 w-4 text-destructive" />}
              />
              <TooltipContent>{String(job.error)}</TooltipContent>
            </Tooltip>
          )}
          {job.status === "completed" && job.result != null && (
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <SheetContent side="right" className="pl-4">
                <SheetHeader>
                  <SheetTitle>{job.label}</SheetTitle>
                </SheetHeader>
                <pre className="mt-4 p-4 rounded-lg bg-muted text-xs overflow-auto max-h-[calc(100vh-8rem)]">
                  {JSON.stringify(job.result, null, 2)}
                </pre>
              </SheetContent>
            </Sheet>
          )}
          {job.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelMutation.mutate({ id: job.id })}
              disabled={cancelMutation.isPending}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
