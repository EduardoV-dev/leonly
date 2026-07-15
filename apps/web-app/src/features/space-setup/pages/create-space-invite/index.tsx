"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { CreateInviteStep } from "../create-space-setup/create-invite-step";

type CreateSpaceInvitePageProps = {
  inviteCode: string;
};

export function CreateSpaceInvitePage({ inviteCode }: CreateSpaceInvitePageProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
  };

  return (
    <SpaceSetupContainer screen={SPACE_SETUP_STEPS.CREATE_INVITE}>
      <CreateInviteStep
        copied={copied}
        inviteCode={inviteCode}
        onContinue={() => router.push(APP_ROUTES.HOME)}
        onCopy={handleCopy}
      />
    </SpaceSetupContainer>
  );
}
