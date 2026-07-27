import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BanIcon, FlagIcon, KeyIcon, UserSearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";
import { invalidateBootstrap } from "@/lib/queries";
import type { User } from "./columns";
import { invalidateAdminUsers } from "./queries";

interface UserActionsProps {
  user: User;
  onBan: (user: User) => void;
  onChangePassword: (user: User) => void;
}

export function UserActions({ user, onBan, onChangePassword }: UserActionsProps) {
  const queryClient = useQueryClient();
  const unban = useMutation(
    orpc.user.unban.mutationOptions({
      onSuccess: async () => {
        await invalidateAdminUsers(queryClient);
        toast.success(`User ${user.email} has been unbanned`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const impersonate = useMutation(
    orpc.user.impersonate.mutationOptions({
      onSuccess: async () => {
        await invalidateBootstrap(queryClient);
        window.location.assign("/app");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex flex-row justify-end space-x-2">
      {user.banned ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => unban.mutate({ userId: user.id })}
          disabled={unban.isPending}
        >
          <FlagIcon />
          Unban
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => onBan(user)}>
          <BanIcon />
          Ban
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => onChangePassword(user)}>
        <KeyIcon />
        Password
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => impersonate.mutate({ userId: user.id })}
        disabled={impersonate.isPending}
      >
        <UserSearchIcon />
      </Button>
    </div>
  );
}
