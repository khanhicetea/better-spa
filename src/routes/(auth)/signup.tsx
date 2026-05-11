import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authClient from "@/lib/auth/auth-client";
import { QUERY_KEYS } from "@/lib/queries";
import { AuthShell } from "./-auth/auth-shell";
import { AuthSocialButtons } from "./-auth/social-buttons";

export const Route = createFileRoute("/(auth)/signup")({
  component: SignupForm,
});

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: signupMutate, isPending: isSubmittingSignup } = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
    }) => {
      await authClient.signUp.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.error(error.message || "Unable to sign up.");
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth });
            navigate({ to: redirectUrl });
          },
        },
      );
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingSignup) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (!name || !email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    signupMutate({ name, email, password });
  };

  return (
    <AuthShell
      title="Create your Better SPA account"
      subtitle="Start with the production baseline."
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                readOnly={isSubmittingSignup}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
                readOnly={isSubmittingSignup}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                readOnly={isSubmittingSignup}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Confirm Password"
                readOnly={isSubmittingSignup}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmittingSignup}
            >
              {isSubmittingSignup && <LoaderCircle className="animate-spin" />}
              {isSubmittingSignup ? "Creating account..." : "Sign up"}
            </Button>
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or continue with
            </span>
          </div>
          <AuthSocialButtons
            callbackURL={redirectUrl}
            isPending={isSubmittingSignup}
          />
        </div>
      </form>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
