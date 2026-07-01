"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { useJoinSpaceSetupForm } from "../../hooks/use-join-space-setup-form";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";

type SpaceJoinSetupPageProps = {
  screen: SpaceSetupJoinSteps;
};

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps) {
  const router = useRouter();
  const {
    clearState,
    completeStep,
    form: {
      control,
      formState: { errors },
      getValues,
      trigger,
    },
    hasLoaded,
    isAllowed,
  } = useJoinSpaceSetupForm(screen);

  const continueToNameStep = async () => {
    const isValid = await trigger("inviteCode");

    if (!isValid) {
      focusInvalidField("invite-code");
      return;
    }

    completeStep(SPACE_SETUP_STEPS.JOIN_CODE, getValues());
    router.push(APP_ROUTES.WELCOME_JOIN_STEP("name"));
  };

  const startStory = async () => {
    const isValid = await trigger("displayName");

    if (!isValid) {
      focusInvalidField("join-display-name");
      return;
    }

    clearState();
    router.push(APP_ROUTES.HOME);
  };

  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: (
      <JoinCodeStep
        control={control}
        inviteCodeError={errors.inviteCode}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        control={control}
        displayNameError={errors.displayName}
        onStartStory={startStory}
      />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
