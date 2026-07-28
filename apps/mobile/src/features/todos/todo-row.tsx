import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Outputs } from "@better-spa/rpc/types";
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: isPending }}
          accessibilityLabel={`Mark ${todo.content} as ${completed ? "not completed" : "completed"}`}
          disabled={isPending}
          hitSlop={8}
          onPress={() =>
            updateTodo.mutate({
              id: todo.id,
              completedAt: completed ? null : new Date().toISOString(),
            })
          }
          style={({ pressed }) => [styles.check, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons
            name={completed ? "checkmark-circle" : "ellipse-outline"}
            color={completed ? colors.success : colors.textMuted}
            size={26}
          />
        </Pressable>
        <Text
          style={[
            styles.content,
            { color: completed ? colors.textMuted : colors.text },
            completed && styles.completed,
          ]}
        >
          {todo.content}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${todo.content}`}
          disabled={isPending}
          hitSlop={8}
          onPress={() => deleteTodo.mutate({ id: todo.id })}
          style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          {deleteTodo.isPending ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <Ionicons name="trash-outline" color={colors.danger} size={20} />
          )}
        </Pressable>
      </View>
      {mutationError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {errorMessage(mutationError, "Unable to update this task.")}
        </Text>
      ) : null}
    </View>
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
  check: {
    width: 28,
    alignItems: "center",
  },
  content: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  completed: {
    textDecorationLine: "line-through",
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginLeft: 39,
    fontSize: 12,
    lineHeight: 17,
  },
});
