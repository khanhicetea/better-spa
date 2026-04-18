import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import authClient from "@/lib/auth/auth-client";
import { invalidateAuthAndShellQueries } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { MoveLeftIcon } from "lucide-react";

export const Route = createFileRoute("/(user)/settings")({
  component: RouteComponent,
});

function NavLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={href} {...props}>
      {children}
    </Link>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshAuthAndShell = async () => {
    await invalidateAuthAndShellQueries(queryClient);
  };

  return (
    <AuthUIProviderTanstack
      authClient={authClient}
      navigate={(href) => {
        navigate({ to: href });
      }}
      onSessionChange={async () => {
        await refreshAuthAndShell();
      }}
      mutators={{
        updateUser: async (
          params: Parameters<typeof authClient.updateUser>[0],
        ) => {
          const result = await authClient.updateUser({
            ...params,
            fetchOptions: {
              throw: false,
            },
          });

          if (result.error) {
            throw result.error;
          }

          await refreshAuthAndShell();
        },
      }}
      Link={NavLink}
    >
      <div className="flex flex-col">
        <div className="absolute top-0 left-0 bg-secondary">
          <Button
            variant="ghost"
            render={
              <Link to="/app" className="block p-2">
                <MoveLeftIcon />
                Back to App
              </Link>
            }
          />
        </div>
        <Outlet />
      </div>
    </AuthUIProviderTanstack>
  );
}
