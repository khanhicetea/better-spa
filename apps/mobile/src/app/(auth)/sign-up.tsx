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

export default function SignUpScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const signUp = useMutation({
    mutationFn: async () => {
      if (password !== confirmation) throw new Error("Passwords do not match.");
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.error) throw new Error(result.error.message || "Unable to create your account.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace("/todos");
    },
  });

  return (
    <AuthScreen
      title="Create your account"
      subtitle="One account for your web and mobile workspace."
      footer={
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          Already have an account?{" "}
          <Link href="/sign-in" style={[styles.link, { color: colors.primary }]}>
            Sign in
          </Link>
        </Text>
      }
    >
      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
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
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormField
        label="Confirm password"
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Repeat your password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => signUp.mutate()}
      />
      {signUp.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
          {errorMessage(signUp.error, "Unable to create your account.")}
        </Text>
      ) : null}
      <PrimaryButton
        label="Create account"
        onPress={() => signUp.mutate()}
        pending={signUp.isPending}
        disabled={!name.trim() || !email.trim() || password.length < 8 || confirmation.length < 8}
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
