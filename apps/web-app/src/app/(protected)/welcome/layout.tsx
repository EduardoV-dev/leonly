import { SpaceSetupRouteTransition } from "@/features/space-setup";
import type { ReactNode } from "react";
import { Suspense } from "react";

type WelcomeLayoutProps = {
  children: ReactNode;
};

export default function WelcomeLayout({ children }: WelcomeLayoutProps) {
  return (
    <Suspense fallback={null}>
      <SpaceSetupRouteTransition>{children}</SpaceSetupRouteTransition>
    </Suspense>
  );
}
