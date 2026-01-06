import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  GripVertical,
  LayoutGrid,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PagePending } from "@/components/common/page-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useListenJob } from "@/lib/hooks/jobs";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";

export const Route = createFileRoute("/(user)/app/todo")({
  component: TodoPage,
  pendingComponent: PagePending,
});

type TodoItem = Outputs["todoItem"]["listTodos"][number];

// Color palette for categories
const categoryColors = [
  {
    bg: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/30",
    accent: "bg-violet-500",
  },
  {
    bg: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/30",
    accent: "bg-blue-500",
  },
  {
    bg: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
  },
  {
    bg: "from-orange-500/20 to-amber-500/10",
    border: "border-orange-500/30",
    accent: "bg-orange-500",
  },
  {
    bg: "from-pink-500/20 to-rose-500/10",
    border: "border-pink-500/30",
    accent: "bg-pink-500",
  },
  {
    bg: "from-indigo-500/20 to-blue-500/10",
    border: "border-indigo-500/30",
    accent: "bg-indigo-500",
  },
];

function getCategoryColor(index: number) {
  return categoryColors[index % categoryColors.length];
}

function TodoPage() {
  const navigate = useNavigate();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);
  const [exportingProgress, setExportingProgress] = useState<number | null>(null);

  const { data: categories, refetch: refetchCategories } = useSuspenseQuery(
    orpc.todoCategory.listCategories.queryOptions(),
  );

  const { data: todos, refetch: refetchTodos } = useSuspenseQuery(
    orpc.todoItem.listTodos.queryOptions(),
  );

  const createCategoryMutation = useMutation(
    orpc.todoCategory.createCategory.mutationOptions({
      onSuccess: () => {
        refetchCategories();
        setNewCategoryName("");
      },
    }),
  );

  const exportMutation = useMutation(
    orpc.todoItem.exportTodos.mutationOptions({
      onSuccess: (job) => {
        if (job) {
          setExportingJobId(job.id);
          setExportingProgress(0);

          toast.success("Export job started", {
            description: "You can view the progress in the Jobs page.",
            action: {
              label: "View Jobs",
              onClick: () => navigate({ to: "/admin/jobs" }),
            },
          });
        }
      },
      onError: (error) => {
        toast.error("Failed to start export", {
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
    onSuccess: (job) => {
      toast.success("Export completed", {
        description: "Your todos have been exported successfully.",
        action: {
          label: "View Jobs",
          onClick: () => navigate({ to: "/app/jobs" }),
        },
      });
    },
    onFailed: (job) => {
      toast.error("Export failed", {
        description: job.error || "An error occurred during export.",
      });
    },
    onCancel: (job) => {
      toast.warning("Export cancelled", {
        description: "The export job was cancelled.",
      });
    },
    onSettled: (job) => {
      setExportingJobId(null);
    },
  });

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate({ name: newCategoryName.trim() });
    }
  };

  const groupedTodos = todos.reduce(
    (acc, todo) => {
      if (!acc[todo.categoryId]) acc[todo.categoryId] = [];
      acc[todo.categoryId].push(todo);
      return acc;
    },
    {} as Record<string, TodoItem[]>,
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const updateTodoMutation = useMutation(
    orpc.todoItem.updateTodo.mutationOptions({
      onSuccess: () => {
        refetchTodos();
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const todo = todos.find((t) => t.id === event.active.id);
    if (todo) setActiveTodo(todo);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTodo(null);
    const { active, over } = event;

    if (!over) return;

    const todoId = active.id as string;
    const newCategoryId = over.id as string;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.categoryId === newCategoryId) return;

    updateTodoMutation.mutate({
      id: todoId,
      categoryId: newCategoryId,
    });
  };

  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => t.completedAt).length;
  const progressPercentage =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="flex flex-col gap-6 p-6 max-w-[100vw]">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <LayoutGrid className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Todo Kanban Board
              </h1>
              <p className="text-sm text-muted-foreground">
                Organize your tasks with drag & drop
              </p>
            </div>
          </div>

          {/* Progress Stats and Export */}
          <div className="flex items-center gap-3">
            {totalTodos > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{totalTodos} Tasks</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{completedTodos} Done</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate({})}
              disabled={exportMutation.isPending}
            >
              {exportingJobId ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {exportingProgress || 0}%
                  </span>
                </div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 -mx-2 px-2">
            {categories.map((category, index) => (
              <CategoryColumn
                key={category.id}
                category={category}
                todos={groupedTodos[category.id] || []}
                colorScheme={getCategoryColor(index)}
                onRefetch={() => {
                  refetchTodos();
                  refetchCategories();
                }}
              />
            ))}
            <AddCategoryColumn
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              onAdd={handleAddCategory}
              isPending={createCategoryMutation.isPending}
            />
          </div>

          <DragOverlay>
            {activeTodo ? (
              <div className="w-64 opacity-90 rotate-3 scale-105">
                <TodoCardPreview todo={activeTodo} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Started with Your Board</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Create your first category to start organizing your tasks. Categories help
              you group related todos together.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TodoCardPreview({ todo }: { todo: TodoItem }) {
  return (
    <Card className="bg-card/95 backdrop-blur-sm border-primary/50 shadow-xl shadow-primary/10">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={!!todo.completedAt} disabled className="h-4 w-4" />
          <p
            className={`text-sm leading-tight ${todo.completedAt ? "line-through text-muted-foreground" : ""}`}
          >
            {todo.content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TodoCard({ todo, onRefetch }: { todo: TodoItem; onRefetch: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingContent, setEditingContent] = useState(todo.content);

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

  const handleToggleComplete = () => {
    updateMutation.mutate({
      id: todo.id,
      completedAt: todo.completedAt ? null : new Date(),
    });
  };

  const handleSaveContent = () => {
    if (editingContent.trim() && editingContent !== todo.content) {
      updateMutation.mutate({ id: todo.id, content: editingContent.trim() });
    } else {
      setIsEditingContent(false);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: todo.id });
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group relative transition-all duration-200 border-border/50 hover:border-border hover:shadow-md ${
        isDragging ? "opacity-40 scale-95" : ""
      } ${todo.completedAt ? "bg-muted/30" : "bg-card hover:bg-card/80"}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="pt-0.5">
                  <Checkbox
                    checked={!!todo.completedAt}
                    onCheckedChange={handleToggleComplete}
                    disabled={updateMutation.isPending}
                    className={`h-5 w-5 rounded-full transition-all ${
                      todo.completedAt
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/40 hover:border-primary"
                    }`}
                  />
                </div>
              }
            />
            <TooltipContent>
              {todo.completedAt ? "Mark as incomplete" : "Mark as complete"}
            </TooltipContent>
          </Tooltip>

          <div className="flex-1 min-w-0">
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
                className="w-full text-sm leading-relaxed resize-none border-none p-0 focus:ring-0 bg-transparent outline-none"
                rows={Math.max(1, editingContent.split("\n").length)}
                autoFocus
              />
            ) : (
              <p
                className={`text-sm leading-relaxed cursor-pointer transition-colors ${
                  todo.completedAt
                    ? "line-through text-muted-foreground"
                    : "hover:text-foreground/80"
                }`}
                onClick={() => {
                  setIsEditingContent(true);
                  setEditingContent(todo.content);
                }}
              >
                {todo.content}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 cursor-grab active:cursor-grabbing hover:bg-muted"
                  {...listeners}
                  {...attributes}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              }
            />
            <TooltipContent>Drag to move</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent>Delete task</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryColumnProps {
  category: { id: string; name: string };
  todos: TodoItem[];
  colorScheme: { bg: string; border: string; accent: string };
  onRefetch: () => void;
}

function CategoryColumn({
  category,
  todos,
  colorScheme,
  onRefetch,
}: CategoryColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoContent, setNewTodoContent] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
  });

  const createMutation = useMutation(
    orpc.todoItem.createTodo.mutationOptions({
      onSuccess: () => {
        onRefetch();
        setNewTodoContent("");
        setIsAdding(false);
      },
    }),
  );

  const deleteCategoryMutation = useMutation(
    orpc.todoCategory.deleteCategory.mutationOptions({
      onSuccess: () => onRefetch(),
    }),
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(category.name);

  const updateCategoryMutation = useMutation(
    orpc.todoCategory.updateCategory.mutationOptions({
      onSuccess: () => {
        onRefetch();
        setIsEditingName(false);
      },
    }),
  );

  const handleAddTodo = () => {
    if (newTodoContent.trim()) {
      createMutation.mutate({
        content: newTodoContent.trim(),
        categoryId: category.id,
      });
    }
  };

  const handleSaveName = () => {
    if (editingName.trim() && editingName !== category.name) {
      updateCategoryMutation.mutate({
        id: category.id,
        name: editingName.trim(),
      });
    } else {
      setIsEditingName(false);
    }
  };

  const handleDeleteCategory = () => {
    if (todos.length === 0) {
      deleteCategoryMutation.mutate({ id: category.id });
    }
  };

  const completedCount = todos.filter((t) => t.completedAt).length;

  return (
    <div className="shrink-0 w-72">
      <div
        ref={setNodeRef}
        className={`rounded-xl border backdrop-blur-sm transition-all duration-200 overflow-hidden ${colorScheme.border} ${
          isOver ? "animate-bounce-subtle shadow-xl shadow-primary/20" : "hover:shadow-md"
        }`}
      >
        {/* Category Header */}
        <div className={`p-4 rounded-t-xl bg-gradient-to-br ${colorScheme.bg}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-2 h-2 rounded-full ${colorScheme.accent}`} />
              {isEditingName ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setEditingName(category.name);
                    }
                  }}
                  className="h-6 text-sm font-semibold border-none p-0 focus-visible:ring-0 bg-transparent"
                  autoFocus
                />
              ) : (
                <span
                  className="font-semibold text-sm truncate cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setIsEditingName(true);
                    setEditingName(category.name);
                  }}
                >
                  {category.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                {completedCount}/{todos.length}
              </Badge>
              {todos.length === 0 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteCategory}
                        disabled={deleteCategoryMutation.isPending}
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    }
                  />
                  <TooltipContent>Delete category</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="p-3 space-y-2 min-h-[100px] bg-background/50">
          {todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onRefetch={onRefetch} />
          ))}

          {isOver && (
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 h-14 flex items-center justify-center">
              <span className="text-sm text-primary/70 font-medium">Drop here</span>
            </div>
          )}

          {todos.length === 0 && !isOver && (
            <div className="text-center py-6 text-muted-foreground">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No tasks yet</p>
            </div>
          )}
        </div>

        {/* Add Todo Section */}
        <div className="p-3 pt-0 bg-background/50 rounded-b-xl">
          {isAdding ? (
            <div className="space-y-2 animate-fade-in">
              <Input
                placeholder="What needs to be done?"
                value={newTodoContent}
                onChange={(e) => setNewTodoContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTodo();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewTodoContent("");
                  }
                }}
                className="h-9 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddTodo}
                  disabled={createMutation.isPending || !newTodoContent.trim()}
                  className="flex-1 h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTodoContent("");
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full h-9 text-muted-foreground hover:text-foreground border border-dashed border-transparent hover:border-border"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Task
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCategoryColumn({
  newCategoryName,
  setNewCategoryName,
  onAdd,
  isPending,
}: {
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  onAdd: () => void;
  isPending: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newCategoryName.trim()) {
      onAdd();
      setIsAdding(false);
    }
  };

  return (
    <div className="shrink-0 w-72">
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 backdrop-blur-sm p-4 min-h-[200px] flex items-center justify-center transition-all hover:border-muted-foreground/40 hover:bg-muted/30">
        {isAdding ? (
          <div className="w-full space-y-3 animate-fade-in">
            <Input
              placeholder="Enter category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewCategoryName("");
                }
              }}
              className="h-10"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isPending || !newCategoryName.trim()}
                className="flex-1 h-9"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategoryName("");
                }}
                className="h-9 px-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center gap-2 h-auto py-6 px-8 text-muted-foreground hover:text-foreground"
          >
            <div className="p-3 rounded-full bg-muted/50 group-hover:bg-muted transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-medium">Add Column</span>
          </Button>
        )}
      </div>
    </div>
  );
}
