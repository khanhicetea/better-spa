import { useMutation } from "@tanstack/react-query";
import { AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/helpers/date";
import { orpc } from "@/lib/orpc";
import { JobResultSheet } from "./job-result-sheet";
import { getJobStatusMeta } from "./status-meta";
import type { Job } from "./types";

interface JobCardProps {
  job: Job;
  onUpdated: () => void;
}

export function JobCard({ job, onUpdated }: JobCardProps) {
  const cancelMutation = useMutation(
    orpc.job.cancel.mutationOptions({
      onSuccess: () => onUpdated(),
    }),
  );

  const statusMeta = getJobStatusMeta(job.status);
  const StatusIcon = statusMeta.icon;

  const isScheduled =
    job.status === "pending" && new Date(job.runAt) > new Date();

  return (
    <Card className="transition-all hover:shadow-md">
      <div className="flex items-center gap-3 p-2 py-1">
        <div
          className={`shrink-0 rounded-lg p-1.5 ${statusMeta.backgroundClassName}`}
        >
          <StatusIcon
            className={`h-4 w-4 ${statusMeta.iconClassName} ${statusMeta.animate ? "animate-spin" : ""}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex flex-col gap-1 truncate text-sm font-medium">
              <div className="flex items-center gap-2">
                <span>{job.label}</span>
                {job.retryCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Retry {job.retryCount}/{job.maxRetries}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">User ID: {job.userId}</Badge>
                {isScheduled && (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    Scheduled: {formatRelativeTime(job.runAt)}
                  </Badge>
                )}
              </div>
            </CardTitle>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(job.createdAt)}
            </span>
          </div>
          {(job.status === "processing" ||
            (job.status === "completed" && job.progress < 100)) && (
            <Progress value={job.progress} className="h-1" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {job.error && (
            <Tooltip>
              <TooltipTrigger
                render={<AlertCircle className="h-4 w-4 text-destructive" />}
              />
              <TooltipContent>{String(job.error)}</TooltipContent>
            </Tooltip>
          )}

          {job.status === "completed" && (
            <JobResultSheet title={job.label} result={job.result} />
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
