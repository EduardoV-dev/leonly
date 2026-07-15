"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useState } from "react";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { CreateInviteStep } from "../create-space-setup/create-invite-step";

type CreateSpaceInvitePageProps = {
  inviteCode: string;
};

export function CreateSpaceInvitePage({ inviteCode }: CreateSpaceInvitePageProps) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
  };

  const completeSetup = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/spaces/setup/complete", { method: "POST" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "We could not complete setup. Please try again.");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "We could not complete setup. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }

    globalThis.location.assign(APP_ROUTES.HOME);
  };

  return (
    <SpaceSetupContainer screen={SPACE_SETUP_STEPS.CREATE_INVITE}>
      <CreateInviteStep
        copied={copied}
        inviteCode={inviteCode}
        isSubmitting={isSubmitting}
        onCopy={handleCopy}
        onContinue={completeSetup}
        submitError={submitError}
      />
    </SpaceSetupContainer>
  );
}
