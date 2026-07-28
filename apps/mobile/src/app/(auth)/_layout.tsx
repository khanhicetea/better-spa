import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/loading-screen";
import { authClient } from "@/lib/auth-client";

export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <LoadingScreen label="Checking your session…" />;
  if (session) return <Redirect href="/todos" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
