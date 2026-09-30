"use client";

import type { ReactNode } from "react";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";
import { useJoinSpaceSetupPage } from "./use-join-space-setup-page";

type SpaceJoinSetupPageProps = Readonly<{
  screen: SpaceSetupJoinSteps;
}>;

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps): ReactNode {
  const {
    control,
    hasLoaded,
    isAllowed,
    isSubmittingCode,
    isSubmittingJoin,
    submitError,
    handleContinueToNameStep,
    handleJoinSpace,
  } = useJoinSpaceSetupPage(screen);

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: (
      <JoinCodeStep
        control={control}
        isSubmitting={isSubmittingCode}
        onContinue={handleContinueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        control={control}
        isSubmitting={isSubmittingJoin}
        onStartStory={handleJoinSpace}
        submitError={submitError}
      />
    ),
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
