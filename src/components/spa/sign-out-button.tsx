import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import authClient from "@/lib/auth/client";

export function SignOutButton() {
  const queryClient = useQueryClient();

  return (
    <Button
      onClick={async () => {
        try {
          await authClient.signOut({
            fetchOptions: {
              onResponse: () => {
                queryClient.clear();
                window.location.assign("/");
              },
            },
          });
        } catch {
          toast.error("Failed to sign out. Please try again.");
        }
      }}
      type="button"
      className="w-fit"
      variant="destructive"
      size="lg"
    >
      Sign out
    </Button>
  );
}
