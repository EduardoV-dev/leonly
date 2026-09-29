import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Name your space",
  description: "Choose a name for your shared memory space.",
};

export default async function CreateNamePage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (activeSpace) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_NAME} />;
}
