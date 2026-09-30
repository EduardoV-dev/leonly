import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceJoinSetupPage } from "@/features/space-setup";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Join a space",
  description: "Enter the invite code for your shared memory space.",
};

export default async function JoinCodePage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (activeSpace) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />;
}
