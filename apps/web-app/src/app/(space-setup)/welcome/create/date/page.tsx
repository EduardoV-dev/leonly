import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Set your date",
  description: "Choose the date your shared story began.",
};

export default async function CreateDatePage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (activeSpace) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />;
}
