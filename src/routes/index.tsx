import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ListTodo,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authQueryOptions } from "@/lib/queries";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const valueCards = [
  {
    title: "Shell-first architecture",
    description:
      "SSR only the application shell and run product interactions as a fast SPA.",
    icon: Shield,
  },
  {
    title: "Background jobs included",
    description:
      "Queue long-running work and process it in a dedicated worker runtime.",
    icon: Briefcase,
  },
  {
    title: "Reference Todo feature",
    description:
      "A compact, production-oriented feature to copy for new modules.",
    icon: ListTodo,
  },
] as const;

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl space-y-14 px-6 py-12 md:py-16">
        <header className="rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Shell SPA Production Baseline
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Build on a clean starter that is ready for real product work.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Keep auth, admin user management, jobs, uploads infrastructure,
                and one reference feature. Remove the demo noise and start
                shipping.
              </p>
              <HeaderActions />
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Included Routes
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  "/",
                  "/login",
                  "/signup",
                  "/app",
                  "/app/todo",
                  "/settings",
                  "/admin",
                  "/admin/users",
                  "/admin/jobs",
                ].map((path) => (
                  <li key={path} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <code>{path}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {valueCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="space-y-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-8 md:p-10">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Start from Todo, then expand by domain.
              </h2>
              <p className="mt-2 text-muted-foreground">
                The Todo page demonstrates auth boundaries, oRPC procedures,
                repositories, and worker-backed exports in one flow.
              </p>
            </div>
            <Button size="lg" render={<Link to="/app/todo" />}>
              Open Todo
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function HeaderActions() {
  const { data: user } = useSuspenseQuery(authQueryOptions());

  if (user) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button size="lg" render={<Link to="/app/todo" />}>
          Go to App
          <ArrowRight data-icon="inline-end" />
        </Button>
        {user.role === "admin" && (
          <Button variant="outline" size="lg" render={<Link to="/admin" />}>
            Open Admin
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="lg" render={<Link to="/signup" />}>
        Create account
      </Button>
      <Button variant="outline" size="lg" render={<Link to="/login" />}>
        Sign in
      </Button>
    </div>
  );
}
