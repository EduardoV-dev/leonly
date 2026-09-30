import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";

export const metadata: Metadata = {
  title: "Invite your partner",
  description: "Invite your partner to begin preserving memories together.",
};

export default async function CreateInvitePage() {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }
  if (activeSpace.onboarding_completed_at) {
    redirect(APP_ROUTES.HOME);
  }

  const inviteCode = activeSpace.invite_code;
  const inviteCodeExpiresAt = activeSpace.invite_code_expires_at;
  const formattedInviteCode =
    inviteCode && inviteCodeExpiresAt && Date.parse(inviteCodeExpiresAt) > Date.now()
      ? formatInviteCodeDisplay(inviteCode)
      : null;

  return (
    <SpaceCreateSetupPage
      screen={SPACE_SETUP_STEPS.CREATE_INVITE}
      inviteCode={formattedInviteCode}
    />
  );
}
