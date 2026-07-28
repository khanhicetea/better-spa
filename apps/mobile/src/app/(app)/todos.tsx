import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { errorMessage } from "@/lib/errors";
import { orpc } from "@/lib/orpc";
import { invalidateTodos } from "@/features/todos/queries";
import { TodoRow } from "@/features/todos/todo-row";
import { useAppColors } from "@/theme/colors";

export default function TodosScreen() {
  const colors = useAppColors();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const todos = useQuery(orpc.todo.list.queryOptions());
  const createTodo = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: async () => {
        setContent("");
        await invalidateTodos(queryClient);
      },
    }),
  );

  const completedCount = todos.data?.filter((todo) => todo.completedAt !== null).length ?? 0;
  const canSubmit = content.trim().length > 0 && !createTodo.isPending;

  function submitTodo() {
    if (!canSubmit) return;
    createTodo.mutate({ content: content.trim() });
  }

  if (todos.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (todos.isError) {
    return (
      <View style={[styles.center, styles.errorState, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" color={colors.textMuted} size={42} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn’t load your tasks</Text>
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>
          {errorMessage(todos.error, "Check your connection and try again.")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => todos.refetch()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.retryLabel, { color: colors.onPrimary }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <FlatList
        data={todos.data}
        keyExtractor={(todo) => todo.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={todos.isRefetching}
            onRefresh={() => todos.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR WORKSPACE</Text>
                <Text style={[styles.title, { color: colors.text }]}>Stay on track</Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.countText, { color: colors.textMuted }]}>
                  {completedCount}/{todos.data.length} done
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.composer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                accessibilityLabel="New task"
                value={content}
                onChangeText={setContent}
                onSubmitEditing={submitTodo}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                returnKeyType="done"
                style={[styles.input, { color: colors.text }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add task"
                disabled={!canSubmit}
                onPress={submitTodo}
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !canSubmit ? 0.45 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                {createTodo.isPending ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Ionicons name="add" color={colors.onPrimary} size={24} />
                )}
              </Pressable>
            </View>
            {createTodo.error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.createError, { color: colors.danger }]}
              >
                {errorMessage(createTodo.error, "Unable to add this task.")}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Ionicons name="sparkles-outline" color={colors.primary} size={30} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>A clear slate</Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              Add your first task above. It will stay in sync with the web app.
            </Text>
          </View>
        }
        renderItem={({ item }) => <TodoRow todo={item} />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorState: {
    paddingHorizontal: 28,
    gap: 10,
  },
  errorTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "800",
  },
  errorBody: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryLabel: { fontWeight: "700" },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
    flexGrow: 1,
  },
  separator: { height: 10 },
  header: {
    gap: 16,
    marginBottom: 20,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  headingCopy: { gap: 5 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  composer: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 15,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createError: {
    marginTop: -8,
    marginHorizontal: 4,
    fontSize: 13,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 34,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyBody: {
    maxWidth: 290,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
