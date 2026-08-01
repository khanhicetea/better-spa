import type { Outputs } from "@kitkit/rpc/types";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ListTodo, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PagePending } from "@/components/shell/page-pending";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/(user)/app/todo")({
  component: TodoPage,
  pendingComponent: PagePending,
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.todo.list.queryOptions()),
});

function TodoPage() {
  const [newTodoContent, setNewTodoContent] = useState("");
  const queryClient = useQueryClient();

  const { data: todos } = useSuspenseQuery(orpc.todo.list.queryOptions());

  const createTodoMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: async () => {
        await invalidateTodos(queryClient);
        setNewTodoContent("");
      },
    }),
  );

  const totalTodos = todos.length;
  const completedTodos = todos.filter((todo) => todo.completedAt).length;
  const progressPercentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Todo</h1>
        </div>

        <TodoSummary
          totalTodos={totalTodos}
          completedTodos={completedTodos}
          progressPercentage={progressPercentage}
        />
      </div>

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
          disabled={createTodoMutation.isPending || !newTodoContent.trim()}
          className="h-10 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No tasks yet. Add one to get started.
          </div>
        ) : (
          todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)
        )}
      </div>
    </div>
  );
}

interface TodoSummaryProps {
  totalTodos: number;
  completedTodos: number;
  progressPercentage: number;
}

function TodoSummary({ totalTodos, completedTodos, progressPercentage }: TodoSummaryProps) {
  if (totalTodos === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{totalTodos} tasks</span>
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
    </div>
  );
}

type TodoItem = Outputs["todo"]["list"][number];

function TodoRow({ todo }: { todo: TodoItem }) {
  const queryClient = useQueryClient();
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(todo.content);

  const updateMutation = useMutation(
    orpc.todo.update.mutationOptions({
      onSuccess: async () => {
        await invalidateTodos(queryClient);
        setIsEditingContent(false);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => invalidateTodos(queryClient),
    }),
  );

  const isCompleted = !!todo.completedAt;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const textareaRows = Math.max(1, editingContent.split("\n").length);

  const handleSaveContent = () => {
    if (editingContent.trim() && editingContent !== todo.content) {
      updateMutation.mutate({ id: todo.id, content: editingContent.trim() });
    } else {
      setIsEditingContent(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        isCompleted ? "bg-muted border-border" : "bg-card border-border hover:border-foreground/20"
      }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => {
          updateMutation.mutate({
            id: todo.id,
            completedAt: isCompleted ? null : new Date().toISOString(),
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
          className="flex-1 resize-none bg-transparent p-0 text-sm outline-none"
          rows={textareaRows}
        />
      ) : (
        <p
          className={`flex-1 cursor-pointer text-sm ${
            isCompleted ? "text-muted-foreground line-through" : "text-foreground"
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
        className="h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function invalidateTodos(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: orpc.todo.list.key({ type: "query" }),
  });
}
