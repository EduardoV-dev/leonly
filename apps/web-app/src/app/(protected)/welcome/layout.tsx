import { SpaceSetupRouteTransition } from "@/features/space-setup";
import type { ReactNode } from "react";

type WelcomeLayoutProps = {
  children: ReactNode;
};

export default function WelcomeLayout({ children }: WelcomeLayoutProps) {
  return <SpaceSetupRouteTransition>{children}</SpaceSetupRouteTransition>;
}
