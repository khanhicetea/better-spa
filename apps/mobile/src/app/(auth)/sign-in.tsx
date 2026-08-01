import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { AuthScreen } from "@/components/auth-screen";
import { FormField } from "@/components/form-field";
import { PrimaryButton } from "@/components/primary-button";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/errors";
import { useAppColors } from "@/theme/colors";

export default function SignInScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) throw new Error(result.error.message || "Unable to sign in.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace("/todos");
    },
  });

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to keep your workspace close, wherever you are."
      footer={
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          New to KitKit?{" "}
          <Link href="/sign-up" style={[styles.link, { color: colors.primary }]}>
            Create an account
          </Link>
        </Text>
      }
    >
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => signIn.mutate()}
      />
      {signIn.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {errorMessage(signIn.error, "Unable to sign in.")}
        </Text>
      ) : null}
      <PrimaryButton
        label="Sign in"
        onPress={() => signIn.mutate()}
        pending={signIn.isPending}
        disabled={!email.trim() || !password}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    textAlign: "center",
    fontSize: 14,
  },
  link: {
    fontWeight: "700",
  },
});
