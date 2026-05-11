import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MoveLeftIcon } from "lucide-react";

export const Route = createFileRoute("/(user)/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
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
  );
}
