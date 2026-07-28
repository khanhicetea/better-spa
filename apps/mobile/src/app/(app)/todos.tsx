import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, Input, Spinner } from "heroui-native";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
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
        <Spinner color={colors.primary} size="lg" />
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
        <Button className="mt-2" onPress={() => todos.refetch()} size="sm">
          Try again
        </Button>
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
              <Chip color="default" size="sm" variant="soft">
                {completedCount}/{todos.data.length} done
              </Chip>
            </View>

            <View
              style={[
                styles.composer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Input
                accessibilityLabel="New task"
                className="flex-1 border-0 bg-transparent px-0 shadow-none"
                value={content}
                onChangeText={setContent}
                onSubmitEditing={submitTodo}
                placeholder="What needs to be done?"
                returnKeyType="done"
              />
              <Button
                accessibilityLabel="Add task"
                isDisabled={!canSubmit}
                isIconOnly
                onPress={submitTodo}
                size="md"
              >
                {createTodo.isPending ? (
                  <Spinner color={colors.onPrimary} size="sm" />
                ) : (
                  <Ionicons name="add" color={colors.onPrimary} size={24} />
                )}
              </Button>
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
          <Card className="items-center gap-2 rounded-3xl px-6 py-8" variant="secondary">
            <Ionicons name="sparkles-outline" color={colors.primary} size={30} />
            <Card.Title className="mt-1 text-lg font-bold">A clear slate</Card.Title>
            <Card.Description className="max-w-72 text-center">
              Add your first task above. It will stay in sync with the web app.
            </Card.Description>
          </Card>
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
  createError: {
    marginTop: -8,
    marginHorizontal: 4,
    fontSize: 13,
  },
});
