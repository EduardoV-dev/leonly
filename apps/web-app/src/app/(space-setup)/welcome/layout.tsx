import type { ReactNode } from "react";
import { Suspense } from "react";
import { SpaceSetupRouteTransition } from "@/features/space-setup";

type WelcomeLayoutProps = {
  children: ReactNode;
};

export default async function WelcomeLayout({ children }: WelcomeLayoutProps) {
  return (
    <Suspense fallback={null}>
      <SpaceSetupRouteTransition>{children}</SpaceSetupRouteTransition>
    </Suspense>
  );
}
