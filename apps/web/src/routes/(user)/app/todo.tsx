import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ListTodo, Plus } from "lucide-react";
import { useState } from "react";
import { PagePending } from "@/components/shell/page-pending";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import { TodoRow } from "./-todo/todo-row";
import { TodoSummary } from "./-todo/todo-summary";
import { invalidateTodos } from "./-todo/queries";

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
