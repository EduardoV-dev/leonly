"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { INVITE_CODE } from "../../components/space-setup-container/constants";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import type { SpaceSetupCreateSteps } from "../../types/setup-types";
import { CreateDateStep } from "./create-date-step";
import { CreateInviteStep } from "./create-invite-step";
import { CreateNameStep } from "./create-name-step";
import { CreateStartStep } from "./create-start-step";

type SpaceCreateSetupPageProps = {
  screen: SpaceSetupCreateSteps;
};

export function SpaceCreateSetupPage({ screen }: SpaceCreateSetupPageProps) {
  const [copied, setCopied] = useState(false);

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(INVITE_CODE);
    setCopied(true);
  };

  const steps: Record<SpaceSetupCreateSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.CREATE_START]: <CreateStartStep />,
    [SPACE_SETUP_STEPS.CREATE_NAME]: <CreateNameStep />,
    [SPACE_SETUP_STEPS.CREATE_DATE]: <CreateDateStep />,
    [SPACE_SETUP_STEPS.CREATE_INVITE]: <CreateInviteStep copied={copied} onCopy={copyInviteCode} />,
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
