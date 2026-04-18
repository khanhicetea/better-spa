import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authClient from "@/lib/auth/auth-client";
import { AuthShell } from "./-auth/auth-shell";
import { AuthSocialButtons } from "./-auth/social-buttons";

export const Route = createFileRoute("/(auth)/login")({
  component: LoginForm,
});

function LoginForm() {
  const navigate = Route.useNavigate();
  const { redirectUrl } = Route.useRouteContext();

  const { mutate: emailLoginMutate, isPending: isSubmittingLogin } =
    useMutation({
      mutationFn: async (data: { email: string; password: string }) =>
        await authClient.signIn.email(
          {
            ...data,
            callbackURL: redirectUrl,
          },
          {
            onError: ({ error }) => {
              toast.error(error.message || "Unable to sign in.");
            },
            onSuccess: () => {
              navigate({ to: redirectUrl, reloadDocument: true });
            },
          },
        ),
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingLogin) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;
    emailLoginMutate({ email, password });
  };

  return (
    <AuthShell title="Sign in to Shell SPA" subtitle="Access your workspace.">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
                readOnly={isSubmittingLogin}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                readOnly={isSubmittingLogin}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmittingLogin}
            >
              {isSubmittingLogin && <LoaderCircle className="animate-spin" />}
              {isSubmittingLogin ? "Signing in..." : "Sign in"}
            </Button>
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or continue with
            </span>
          </div>
          <AuthSocialButtons
            callbackURL={redirectUrl}
            isPending={isSubmittingLogin}
          />
        </div>
      </form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
    </AuthShell>
  );
}
