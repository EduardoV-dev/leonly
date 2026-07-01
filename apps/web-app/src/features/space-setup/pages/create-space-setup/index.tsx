"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Control } from "react-hook-form";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { INVITE_CODE } from "../../components/space-setup-container/constants";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import {
  type CreateSpaceSetupFormValues,
  useCreateSpaceSetupForm,
} from "../../hooks/use-create-space-setup-form";
import type { SpaceSetupCreateSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { CreateDateStep } from "./create-date-step";
import { CreateInviteStep } from "./create-invite-step";
import { CreateNameStep } from "./create-name-step";
import { CreateStartStep } from "./create-start-step";

type SpaceCreateSetupPageProps = {
  screen: SpaceSetupCreateSteps;
};

export function SpaceCreateSetupPage({ screen }: SpaceCreateSetupPageProps) {
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
  } = useCreateSpaceSetupForm(screen);
  const [copied, setCopied] = useState(false);

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(INVITE_CODE);
    setCopied(true);
  };

  const continueToNameStep = async () => {
    const isValid = await trigger("displayName");

    if (!isValid) {
      focusInvalidField("display-name");
      return;
    }

    completeStep(SPACE_SETUP_STEPS.CREATE_START, getValues());
    router.push(APP_ROUTES.WELCOME_CREATE_STEP("name"));
  };

  const continueToDateStep = async () => {
    const isValid = await trigger("spaceName");

    if (!isValid) {
      focusInvalidField("space-name");
      return;
    }

    completeStep(SPACE_SETUP_STEPS.CREATE_NAME, getValues());
    router.push(APP_ROUTES.WELCOME_CREATE_STEP("date"));
  };

  const continueToInviteStep = async () => {
    const isValid = await trigger("firstDay");

    if (!isValid) {
      focusInvalidField("first-day-trigger");
      return;
    }

    completeStep(SPACE_SETUP_STEPS.CREATE_DATE, getValues());
    router.push(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
  };

  const startStory = () => {
    clearState();
    router.push(APP_ROUTES.HOME);
  };

  const firstDayControl: Control<CreateSpaceSetupFormValues> = control;

  const steps: Record<SpaceSetupCreateSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.CREATE_START]: (
      <CreateStartStep
        control={control}
        displayNameError={errors.displayName}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_NAME]: (
      <CreateNameStep
        control={control}
        onContinue={continueToDateStep}
        spaceNameError={errors.spaceName}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_DATE]: (
      <CreateDateStep
        control={firstDayControl}
        firstDayError={errors.firstDay}
        onContinue={continueToInviteStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_INVITE]: (
      <CreateInviteStep copied={copied} onCopy={copyInviteCode} onStartStory={startStory} />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
