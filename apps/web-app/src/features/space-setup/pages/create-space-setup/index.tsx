"use client";

import type { ReactNode } from "react";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import type { SpaceSetupCreateSteps } from "../../types/setup-types";
import { CreateDateStep } from "./create-date-step";
import { CreateInviteStep } from "./create-invite-step";
import { CreateNameStep } from "./create-name-step";
import { CreateStartStep } from "./create-start-step";
import { useCreateSpaceSetupPage } from "./use-create-space-setup-page";

type SpaceCreateSetupPageProps = Readonly<{
  inviteCode?: string | null;
  screen: SpaceSetupCreateSteps;
}>;

export function SpaceCreateSetupPage({
  inviteCode = null,
  screen,
}: SpaceCreateSetupPageProps): ReactNode {
  const {
    control,
    copied,
    hasLoaded,
    isAllowed,
    isSubmitting,
    submitError,
    handleContinueToNameStep,
    handleContinueToDateStep,
    handleContinueToInviteStep,
    handleCopyInviteCode,
    handleCompleteSetup,
  } = useCreateSpaceSetupPage({ inviteCode, screen });

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  const steps: Record<SpaceSetupCreateSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.CREATE_START]: (
      <CreateStartStep
        control={control}
        isSubmitting={isSubmitting}
        onContinue={handleContinueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_NAME]: (
      <CreateNameStep
        control={control}
        isSubmitting={isSubmitting}
        onContinue={handleContinueToDateStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_DATE]: (
      <CreateDateStep
        control={control}
        isSubmitting={isSubmitting}
        onContinue={handleContinueToInviteStep}
        submitError={submitError}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_INVITE]: (
      <CreateInviteStep
        copied={copied}
        isCompleting={isSubmitting}
        inviteCode={inviteCode}
        submitError={submitError}
        onContinue={handleCompleteSetup}
        onCopy={handleCopyInviteCode}
      />
    ),
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
