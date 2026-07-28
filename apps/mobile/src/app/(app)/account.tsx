import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { apiUrl } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useAppColors } from "@/theme/colors";

export default function AccountScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const bootstrap = useQuery(orpc.app.bootstrap.queryOptions());

  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Unable to sign out.");
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/sign-in");
    },
  });

  const user = bootstrap.data?.user;
  const initials = (user?.name ?? session?.user.name ?? "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={bootstrap.isRefetching}
          onRefresh={() => bootstrap.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initials, { color: colors.onPrimary }]}>{initials || "U"}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name ?? session?.user.name ?? "Your account"}
          </Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {user?.email ?? session?.user.email}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <Ionicons name="git-network-outline" color={colors.primary} size={21} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Backend connection</Text>
        </View>
        {bootstrap.isError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
            {errorMessage(bootstrap.error, "Unable to reach the API.")}
          </Text>
        ) : (
          <>
            <InfoRow
              label="Status"
              value={bootstrap.isPending ? "Connecting…" : "Connected"}
              valueColor={bootstrap.isPending ? colors.textMuted : colors.success}
            />
            <InfoRow label="API" value={apiUrl} />
            <InfoRow label="Runtime" value={bootstrap.data?.app.runtime ?? "—"} />
            <InfoRow label="Environment" value={bootstrap.data?.app.environment ?? "—"} />
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <Ionicons name="shield-checkmark-outline" color={colors.primary} size={21} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Session</Text>
        </View>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Better Auth stores your session securely on this device and sends it with authenticated
          oRPC requests.
        </Text>
      </View>

      {signOut.error ? (
        <Text accessibilityRole="alert" style={[styles.signOutError, { color: colors.danger }]}>
          {errorMessage(signOut.error, "Unable to sign out.")}
        </Text>
      ) : null}
      <PrimaryButton
        label="Sign out"
        variant="secondary"
        pending={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: valueColor ?? colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 16,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 4,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 21,
    fontWeight: "800",
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
  },
  email: { fontSize: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    gap: 14,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  infoLabel: { fontSize: 13 },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
  signOutError: {
    textAlign: "center",
    fontSize: 13,
  },
});
