import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/server/rpc/types";

type TodoItem = Outputs["todo"]["list"][number];

interface TodoRowProps {
  todo: TodoItem;
  onRefetch: () => void;
}

export function TodoRow({ todo, onRefetch }: TodoRowProps) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(todo.content);

  const updateMutation = useMutation(
    orpc.todo.update.mutationOptions({
      onSuccess: () => {
        onRefetch();
        setIsEditingContent(false);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => onRefetch(),
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
        isCompleted
          ? "bg-muted border-border"
          : "bg-card border-border hover:border-foreground/20"
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
          className="flex-1 resize-none bg-transparent p-0 text-sm outline-none"
          rows={textareaRows}
        />
      ) : (
        <p
          className={`flex-1 cursor-pointer text-sm ${
            isCompleted
              ? "text-muted-foreground line-through"
              : "text-foreground"
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
