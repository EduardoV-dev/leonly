import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Create your space",
  description: "Start creating a private place for your shared memories.",
};

export default async function CreateStartPage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (activeSpace) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_START} />;
}
