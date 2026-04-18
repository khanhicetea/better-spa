import { CheckCircle2, Download, ListTodo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodoSummaryProps {
  totalTodos: number;
  completedTodos: number;
  progressPercentage: number;
  isExporting: boolean;
  exportingProgress: number;
  isExportPending: boolean;
  onExport: () => void;
}

export function TodoSummary({
  totalTodos,
  completedTodos,
  progressPercentage,
  isExporting,
  exportingProgress,
  isExportPending,
  onExport,
}: TodoSummaryProps) {
  if (totalTodos === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {totalTodos} tasks
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{completedTodos} done</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-sm font-medium">{progressPercentage}%</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        disabled={isExportPending || isExporting}
      >
        {isExporting ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">{exportingProgress}%</span>
          </div>
        ) : (
          <Download className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
