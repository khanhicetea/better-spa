"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { orpc } from "@/lib/orpc";
import { authQueryOptions, QUERY_KEYS } from "@/lib/queries";
import { handleFormError, handleToastError } from "@/lib/helpers/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    ),
  timezone: z.string().min(1, "Timezone is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function UpdateProfileCard() {
  const { data: user, isPending } = useSuspenseQuery(authQueryOptions());
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const updateProfile = useMutation(orpc.user.updateProfile.mutationOptions());

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("Profile updated");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth });
    } catch (error) {
      handleFormError(error, form.setError);
      handleToastError(error);
    }
  };

  if (isPending) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="my-0.5 h-5 w-1/3" />
          <Skeleton className="mt-1.5 mb-0.5 h-3 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="mt-4 h-9 w-full" />
          <Skeleton className="mt-4 h-9 w-full" />
        </CardContent>
        <CardFooter className="flex flex-col justify-between gap-4 rounded-b-xl md:flex-row">
          <Skeleton className="my-0.5 h-3 w-48" />
          <Skeleton className="h-8 w-14 md:ms-auto" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <Card className="w-full pb-0">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Profile</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Update your name, username, and timezone
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="update-profile-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      disabled={updateProfile.isPending}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your_username"
                      disabled={updateProfile.isPending}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="UTC"
                      disabled={updateProfile.isPending}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </CardContent>

        <CardFooter className="flex flex-col justify-between gap-4 rounded-b-xl border-t bg-sidebar md:flex-row !py-4">
          <p className="text-muted-foreground text-xs md:text-sm text-center md:text-start">
            Your username must be unique and can only contain letters, numbers, hyphens, and
            underscores.
          </p>
          <Button type="submit" form="update-profile-form" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </Form>
  );
}
