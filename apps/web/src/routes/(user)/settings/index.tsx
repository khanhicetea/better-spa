import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordCard } from "./-settings/change-password-card";
import { SocialProvidersCard } from "./-settings/social-providers-card";
import { UpdateProfileCard } from "./-settings/update-profile-card";

export const Route = createFileRoute("/(user)/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="py-4 w-full max-w-3xl space-y-4 md:space-y-6 mx-auto">
      <UpdateProfileCard />
      <ChangePasswordCard />
      <SocialProvidersCard />
    </div>
  );
}
