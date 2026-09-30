import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({ children }: Readonly<ApplicationLayoutProps>) {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }
  if (!activeSpace.onboarding_completed_at) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
  }

  return children;
}
