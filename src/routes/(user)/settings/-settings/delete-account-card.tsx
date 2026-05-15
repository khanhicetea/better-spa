"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import authClient from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useSuspenseQuery } from "@tanstack/react-query";
import { authQueryOptions } from "@/lib/queries";

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type DeleteFormValues = z.infer<typeof deleteSchema>;

export function DeleteAccountCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: user } = useSuspenseQuery(authQueryOptions());

  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (values: DeleteFormValues) => {
    setIsDeleting(true);
    try {
      await authClient.deleteUser({
        password: values.password,
        callbackURL: `${window.location.origin}`,
        fetchOptions: { throw: true },
      });

      toast.success("Account deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="w-full pb-0 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Delete Account</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col justify-between gap-4 rounded-b-xl border-t border-destructive/30 bg-destructive/15 md:flex-row !py-4">
          <p className="text-muted-foreground text-xs md:text-sm text-center md:text-start">
            This action is irreversible. All your data will be permanently
            removed.
          </p>
          <Button variant="destructive" onClick={() => setDialogOpen(true)}>
            Delete Account
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Enter your password to confirm account deletion for{" "}
              <strong>{user?.email}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        disabled={isDeleting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
