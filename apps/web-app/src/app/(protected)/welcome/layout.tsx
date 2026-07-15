import { APP_ROUTES } from "@/constants/routes";
import { SpaceSetupRouteTransition } from "@/features/space-setup";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

type WelcomeLayoutProps = {
  children: ReactNode;
};

export default async function WelcomeLayout({ children }: WelcomeLayoutProps) {
  const activeSpace = await getActiveSpaceForCurrentUser();

  if (activeSpace?.onboarding_completed_at) {
    redirect(APP_ROUTES.HOME);
  }

  return (
    <Suspense fallback={null}>
      <SpaceSetupRouteTransition>{children}</SpaceSetupRouteTransition>
    </Suspense>
  );
}
