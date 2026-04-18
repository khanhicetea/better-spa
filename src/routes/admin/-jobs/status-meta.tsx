import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { JobStatus } from "@/server/db/schema/job";

type JobStatusMeta = {
  icon: LucideIcon;
  iconClassName: string;
  backgroundClassName: string;
  animate: boolean;
  label: string;
};

const STATUS_META: Record<JobStatus, JobStatusMeta> = {
  pending: {
    icon: Clock,
    iconClassName: "text-muted-foreground",
    backgroundClassName: "bg-muted",
    label: "Pending",
    animate: false,
  },
  processing: {
    icon: Loader2,
    iconClassName: "text-primary",
    backgroundClassName: "bg-primary/10",
    label: "Processing",
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    iconClassName: "text-accent-foreground",
    backgroundClassName: "bg-accent",
    label: "Completed",
    animate: false,
  },
  failed: {
    icon: AlertCircle,
    iconClassName: "text-destructive",
    backgroundClassName: "bg-destructive/10",
    label: "Failed",
    animate: false,
  },
  cancelled: {
    icon: X,
    iconClassName: "text-muted-foreground",
    backgroundClassName: "bg-muted",
    label: "Cancelled",
    animate: false,
  },
};

export function getJobStatusMeta(status: JobStatus): JobStatusMeta {
  return STATUS_META[status];
}
