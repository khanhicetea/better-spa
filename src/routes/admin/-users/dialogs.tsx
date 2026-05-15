import type { UserWithRole } from "better-auth/plugins";
import { CopyIcon, Dice2Icon, EyeIcon, EyeOff, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import authClient from "@/lib/auth/client";
import type { User } from "./columns";

interface BanUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BanUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: BanUserDialogProps) {
  const form = useForm<{ banReason: string; banExpire: string | undefined }>({
    defaultValues: {
      banReason: "",
      banExpire: undefined,
    },
  });

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsPending(true);
    const res = await authClient.admin.banUser({
      userId: user.id,
      banReason: data.banReason,
      banExpiresIn: data.banExpire
        ? Math.floor(
            (new Date(`${data.banExpire}:00`).getTime() - Date.now()) / 1000,
          )
        : undefined,
    });
    setIsPending(false);

    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    onOpenChange(false);
    onSuccess();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban user &quot;{user.email}&quot;</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="banReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ban reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ban reason" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="banExpire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ban expiration</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={isPending} type="submit" variant="destructive">
              {isPending ? "Banning..." : "Ban user"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePasswordDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangePasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: ChangePasswordDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const form = useForm<{ newPassword: string }>({
    defaultValues: { newPassword: "" },
  });

  const handleGeneratePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("newPassword", result);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsPending(true);
    const res = await authClient.admin.setUserPassword({
      userId: user.id,
      newPassword: data.newPassword,
    });
    setIsPending(false);

    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    onOpenChange(false);
    onSuccess();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Change password for &quot;{user.email}&quot;
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <ButtonGroup className="w-full">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGeneratePassword}
                      >
                        <Dice2Icon />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(field.value)
                            .then(() => {
                              toast.success("Password copied to clipboard");
                            });
                        }}
                      >
                        <CopyIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOff /> : <EyeIcon />}
                      </Button>
                    </ButtonGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Change password"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type CreateUser = {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
};

interface CreateUserSheetProps {
  onSuccess: (user: UserWithRole) => void;
}

export function CreateUserSheet({ onSuccess }: CreateUserSheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const form = useForm<CreateUser>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "user",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsPending(true);
    const res = await authClient.admin.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
    });
    setIsPending(false);

    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    setOpen(false);
    form.reset();
    onSuccess(res.data.user);
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <PlusCircle className="size-4" />
            <span>Add user</span>
          </Button>
        }
      />
      <SheetContent>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <SheetHeader>
              <SheetTitle>Create user</SheetTitle>
            </SheetHeader>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User role</FormLabel>
                    <FormControl>
                      <NativeSelect
                        onChange={field.onChange}
                        value={field.value}
                      >
                        <NativeSelectOption value="user">
                          User
                        </NativeSelectOption>
                        <NativeSelectOption value="admin">
                          Admin
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="flex flex-row justify-end">
              <Button disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
