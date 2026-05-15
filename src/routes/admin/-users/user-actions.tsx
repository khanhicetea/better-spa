import { useNavigate } from "@tanstack/react-router";
import { BanIcon, FlagIcon, KeyIcon, UserSearchIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import authClient from "@/lib/auth/client";
import type { User } from "./columns";

interface UserActionsProps {
  user: User;
  onBan: (user: User) => void;
  onChangePassword: (user: User) => void;
  onUpdated: (message: string) => void;
}

export function UserActions({ user, onBan, onChangePassword, onUpdated }: UserActionsProps) {
  const navigate = useNavigate();
  const [isUnbanning, setIsUnbanning] = useState(false);

  return (
    <div className="flex flex-row justify-end space-x-2">
      {user.banned ? (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            setIsUnbanning(true);
            const res = await authClient.admin.unbanUser({ userId: user.id });
            setIsUnbanning(false);
            if (res.error) {
              toast.error(res.error.message);
              return;
            }
            onUpdated(`User ${user.email} has been unbanned`);
          }}
          disabled={isUnbanning}
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
        onClick={async () => {
          const res = await authClient.admin.impersonateUser({
            userId: user.id,
          });
          if (res.error) {
            toast.error(res.error.message);
            return;
          }
          navigate({ to: "/app", reloadDocument: true });
        }}
      >
        <UserSearchIcon />
      </Button>
    </div>
  );
}
