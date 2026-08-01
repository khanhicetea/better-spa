import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Checkbox, Spinner } from "heroui-native";
import { StyleSheet, Text, View } from "react-native";
import type { Outputs } from "@kitkit/rpc/types";
import { errorMessage } from "@/lib/errors";
import { orpc } from "@/lib/orpc";
import { useAppColors } from "@/theme/colors";
import { invalidateTodos } from "./queries";

type Todo = Outputs["todo"]["list"][number];

export function TodoRow({ todo }: { todo: Todo }) {
  const colors = useAppColors();
  const queryClient = useQueryClient();
  const completed = todo.completedAt !== null;

  const updateTodo = useMutation(
    orpc.todo.update.mutationOptions({
      onSuccess: () => invalidateTodos(queryClient),
    }),
  );
  const deleteTodo = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => invalidateTodos(queryClient),
    }),
  );
  const isPending = updateTodo.isPending || deleteTodo.isPending;
  const mutationError = updateTodo.error ?? deleteTodo.error;

  return (
    <Card className="gap-2 rounded-2xl" style={styles.card}>
      <View style={styles.row}>
        <Checkbox
          accessibilityLabel={`Mark ${todo.content} as ${completed ? "not completed" : "completed"}`}
          isDisabled={isPending}
          isSelected={completed}
          onSelectedChange={() =>
            updateTodo.mutate({
              id: todo.id,
              completedAt: completed ? null : new Date().toISOString(),
            })
          }
        />
        <Text
          style={[
            styles.content,
            { color: completed ? colors.textMuted : colors.text },
            completed && styles.completed,
          ]}
        >
          {todo.content}
        </Text>
        <Button
          accessibilityLabel={`Delete ${todo.content}`}
          isDisabled={isPending}
          isIconOnly
          onPress={() => deleteTodo.mutate({ id: todo.id })}
          size="sm"
          variant="danger-soft"
        >
          {deleteTodo.isPending ? (
            <Spinner color={colors.danger} size="sm" />
          ) : (
            <Ionicons name="trash-outline" color={colors.danger} size={18} />
          )}
        </Button>
      </View>
      {mutationError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {errorMessage(mutationError, "Unable to update this task.")}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  content: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  completed: {
    textDecorationLine: "line-through",
  },
  error: {
    marginLeft: 39,
    fontSize: 12,
    lineHeight: 17,
  },
});
