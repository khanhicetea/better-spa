import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  Loader2,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PagePending } from "@/components/common/page-pending";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useListenJob } from "@/lib/hooks/jobs";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";

export const Route = createFileRoute("/(user)/app/todo")({
  component: TodoPage,
  pendingComponent: PagePending,
});

type TodoItem = Outputs["todoItem"]["listTodos"][number];

function TodoPage() {
  // 1. State hooks
  const [newTodoContent, setNewTodoContent] = useState("");
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);
  const [exportingProgress, setExportingProgress] = useState<number | null>(
    null,
  );

  // 2. Query and mutation hooks
  const { data: todos, refetch: refetchTodos } = useSuspenseQuery(
    orpc.todoItem.listTodos.queryOptions(),
  );

  const createTodoMutation = useMutation(
    orpc.todoItem.createTodo.mutationOptions({
      onSuccess: () => {
        refetchTodos();
        setNewTodoContent("");
      },
    }),
  );

  const exportMutation = useMutation(
    orpc.todoItem.exportTodos.mutationOptions({
      onSuccess: (job) => {
        if (job) {
          setExportingJobId(job.id);
          setExportingProgress(0);
          toast.success("Export started", {
            description: "Your todos are being exported.",
          });
        }
      },
      onError: (error) => {
        toast.error("Export failed", {
          description: error.message,
        });
      },
    }),
  );

  useListenJob<"export_todos">({
    jobId: exportingJobId || "",
    enabled: !!exportingJobId,
    onChange: (job) => {
      if (job.status === "processing") {
        setExportingProgress(job.progress);
      }
    },
    onSuccess: () => {
      toast.success("Export completed", {
        description: "Your todos have been exported successfully.",
      });
    },
    onFailed: (job) => {
      toast.error("Export failed", {
        description: job.error || "An error occurred during export.",
      });
    },
    onSettled: () => {
      setExportingJobId(null);
    },
  });

  // 3. Derived values
  const isExporting = !!exportingJobId;
  const isCreating = createTodoMutation.isPending;

  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => t.completedAt).length;
  const progressPercentage =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // 4. Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/5 to-accent/5">
      <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Todo List</h1>
          </div>

          {/* Stats */}
          {totalTodos > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-card/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {totalTodos} tasks
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {completedTodos} done
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {progressPercentage}%
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportMutation.mutate({})}
                disabled={exportMutation.isPending || isExporting}
              >
                {isExporting ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">{exportingProgress || 0}%</span>
                  </div>
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="flex gap-2">
          <Input
            placeholder="What needs to be done?"
            value={newTodoContent}
            onChange={(e) => setNewTodoContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTodoContent.trim()) {
                createTodoMutation.mutate({ content: newTodoContent.trim() });
              }
            }}
            className="h-10"
          />
          <Button
            onClick={() => {
              if (newTodoContent.trim()) {
                createTodoMutation.mutate({ content: newTodoContent.trim() });
              }
            }}
            disabled={isCreating || !newTodoContent.trim()}
            className="h-10 px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Todo List */}
        <div className="space-y-2">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks yet. Add one to get started!</p>
            </div>
          ) : (
            todos.map((todo) => (
              <TodoItemRow key={todo.id} todo={todo} onRefetch={refetchTodos} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TodoItemRow({
  todo,
  onRefetch,
}: {
  todo: TodoItem;
  onRefetch: () => void;
}) {
  // 1. State hooks
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(todo.content);

  // 2. Query and mutation hooks
  const updateMutation = useMutation(
    orpc.todoItem.updateTodo.mutationOptions({
      onSuccess: () => {
        onRefetch();
        setIsEditingContent(false);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.todoItem.deleteTodo.mutationOptions({
      onSuccess: () => onRefetch(),
    }),
  );

  // 3. Derived values
  const isCompleted = !!todo.completedAt;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const textareaRows = Math.max(1, editingContent.split("\n").length);

  // 4. Complex event handlers
  const handleSaveContent = () => {
    if (editingContent.trim() && editingContent !== todo.content) {
      updateMutation.mutate({ id: todo.id, content: editingContent.trim() });
    } else {
      setIsEditingContent(false);
    }
  };

  // 5. Render
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isCompleted
          ? "bg-muted/30 border-border/40"
          : "bg-card/50 border-border/40 hover:border-border/60"
      }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => {
          updateMutation.mutate({
            id: todo.id,
            completedAt: isCompleted ? null : new Date(),
          });
        }}
        disabled={isUpdating}
        className="h-5 w-5 rounded"
      />

      {isEditingContent ? (
        <textarea
          value={editingContent}
          onChange={(e) => setEditingContent(e.target.value)}
          onBlur={handleSaveContent}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSaveContent();
            }
            if (e.key === "Escape") {
              setIsEditingContent(false);
              setEditingContent(todo.content);
            }
          }}
          className="flex-1 text-sm resize-none border-none p-0 focus:ring-0 bg-transparent outline-none"
          rows={textareaRows}
        />
      ) : (
        <p
          className={`flex-1 text-sm cursor-pointer transition-colors ${
            isCompleted
              ? "line-through text-muted-foreground"
              : "hover:text-foreground/80"
          }`}
          onClick={() => setIsEditingContent(true)}
        >
          {todo.content}
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteMutation.mutate({ id: todo.id })}
        disabled={isDeleting}
        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
