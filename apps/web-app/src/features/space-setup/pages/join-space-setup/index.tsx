"use client";

import type { ReactNode } from "react";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";

type SpaceJoinSetupPageProps = {
  screen: SpaceSetupJoinSteps;
};

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps) {
  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: <JoinCodeStep />,
    [SPACE_SETUP_STEPS.JOIN_NAME]: <JoinNameStep />,
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
