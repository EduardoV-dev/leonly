"use client";

import type { ReactNode } from "react";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { useSpaceSetupState } from "../../hooks/use-space-setup-state";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";

type SpaceJoinSetupPageProps = {
  screen: SpaceSetupJoinSteps;
};

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps) {
  const { formState, updateField } = useSpaceSetupState();

  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: (
      <JoinCodeStep
        inviteCode={formState.inviteCode}
        onInviteCodeChange={(value) => updateField("inviteCode", value)}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        displayName={formState.displayName}
        onDisplayNameChange={(value) => updateField("displayName", value)}
      />
    ),
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
