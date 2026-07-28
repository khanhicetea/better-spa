import { Redirect } from "expo-router";
import { LoadingScreen } from "@/components/loading-screen";
import { authClient } from "@/lib/auth-client";

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <LoadingScreen label="Restoring your session…" />;
  return <Redirect href={session ? "/todos" : "/sign-in"} />;
}
