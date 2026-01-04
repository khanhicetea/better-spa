import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { PagePending } from "@/components/common/page-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserJobs } from "@/lib/hooks/jobs";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";

export const Route = createFileRoute("/(user)/app/jobs")({
  component: JobsPage,
  pendingComponent: PagePending,
});

type Job = Outputs["job"]["listJobs"][number];

function JobsPage() {
  const { data: jobs, isLoading, refetch } = useUserJobs({ limit: 50 });

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
  const queryClient = useQueryClient();
  const cancelMutation = useMutation(
    orpc.job.cancelJob.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["job"] });
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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <StatusIcon
                className={`h-4 w-4 ${config.color} ${config.animate ? "animate-spin" : ""}`}
              />
            </div>
            <div>
              <CardTitle className="text-base">{job.label}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Created{" "}
                {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            {job.status === "pending" && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelMutation.mutate({ id: job.id })}
                      disabled={cancelMutation.isPending}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent>Cancel job</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(job.status === "processing" || job.status === "completed") && (
          <Progress value={job.progress} className="mt-2">
            <ProgressLabel>Progress</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}
        {job.error && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {String(job.error)}
          </div>
        )}
        {job.status === "completed" && job.result != null && (
          <div className="mt-3">
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                View result
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-auto max-h-48">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
        {job.completedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Completed{" "}
            {formatDistanceToNow(new Date(job.completedAt), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
