import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceJoinSetupPage } from "@/features/space-setup";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Introduce yourself",
  description: "Add your name before joining a shared memory space.",
};

export default async function JoinNamePage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (activeSpace) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_NAME} />;
}
