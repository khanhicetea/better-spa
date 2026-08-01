"use client";

import type { Account } from "@kitkit/auth/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import authClient from "@/lib/auth-client";
import { bootstrapQueryOptions, invalidateBootstrap } from "@/lib/queries";

type ProviderInfo = {
  id: string;
  name: string;
};

const KNOWN_PROVIDERS: ProviderInfo[] = [
  { id: "github", name: "GitHub" },
  { id: "google", name: "Google" },
];

const accountsQueryKey = ["accounts"] as const;

export function SocialProvidersCard() {
  const queryClient = useQueryClient();
  const { data: bootstrap } = useQuery(bootstrapQueryOptions());
  const providers = KNOWN_PROVIDERS.filter((provider) =>
    bootstrap?.capabilities.oauthProviders.includes(provider.id as "github" | "google"),
  );

  const { data: accounts, isPending } = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const result = await authClient.listAccounts();
      return (result.data as Account[]) ?? [];
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (providerId: string) => {
      await authClient.linkSocial({
        provider: providerId as "github" | "google",
        callbackURL: `${window.location.origin}/settings`,
        fetchOptions: { throw: true },
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to link account");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await authClient.unlinkAccount({
        accountId,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: async () => {
      toast.success("Account unlinked");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
        invalidateBootstrap(queryClient),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to unlink account");
    },
  });

  const linkedProviderIds = accounts?.map((a) => a.providerId) ?? [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Providers</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Connect or disconnect social accounts
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3">
          {isPending
            ? providers.map((p) => (
                <Card key={p.id} className="flex-row items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton className="size-4 shrink-0" />
                    <div className="flex min-w-0 flex-col">
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-14 ms-auto shrink-0" />
                </Card>
              ))
            : providers.map((provider) => {
                const linkedAccount = accounts?.find(
                  (account) => account.providerId === provider.id,
                );
                const isLinked = linkedProviderIds.includes(provider.id);

                return (
                  <Card key={provider.id} className="flex-row items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="text-sm font-medium shrink-0">{provider.name}</span>
                    </div>

                    <Button
                      size="sm"
                      variant={isLinked ? "outline" : "default"}
                      disabled={isLinked ? unlinkMutation.isPending : linkMutation.isPending}
                      onClick={
                        linkedAccount
                          ? () => unlinkMutation.mutate(linkedAccount.id)
                          : () => linkMutation.mutate(provider.id)
                      }
                      className="ms-auto shrink-0"
                    >
                      {isLinked ? "Unlink" : "Link"}
                    </Button>
                  </Card>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}
