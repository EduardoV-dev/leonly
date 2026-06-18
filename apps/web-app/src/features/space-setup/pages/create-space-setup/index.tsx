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
import { CreateDateStep } from "./create-date-step";
import { CreateInviteStep } from "./create-invite-step";
import { CreateNameStep } from "./create-name-step";
import { CreateStartStep } from "./create-start-step";

type AttemptedCreateFields = Record<keyof CreateSpaceSetupFormValues, boolean>;

type SpaceCreateSetupPageProps = {
  screen: SpaceSetupCreateSteps;
};

export function SpaceCreateSetupPage({ screen }: SpaceCreateSetupPageProps) {
  const router = useRouter();
  const {
    control,
    formState: { errors },
    trigger,
  } = useCreateSpaceSetupForm();
  const [copied, setCopied] = useState(false);
  const [attemptedFields, setAttemptedFields] = useState<AttemptedCreateFields>({
    displayName: false,
    spaceName: false,
    firstDay: false,
  });

  const firstDayControl: Control<CreateSpaceSetupFormValues> = control;

  const continueToNameStep = async () => {
    setAttemptedFields((current) => ({ ...current, displayName: true }));
    const isValid = await trigger("displayName");

    if (isValid) {
      router.push(APP_ROUTES.WELCOME_CREATE_STEP("name"));
    }
  };

  const continueToDateStep = async () => {
    setAttemptedFields((current) => ({ ...current, spaceName: true }));
    const isValid = await trigger("spaceName");

    if (isValid) {
      router.push(APP_ROUTES.WELCOME_CREATE_STEP("date"));
    }
  };

  const continueToInviteStep = async () => {
    setAttemptedFields((current) => ({ ...current, firstDay: true }));
    const isValid = await trigger("firstDay");

    if (isValid) {
      router.push(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
    }
  };

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(INVITE_CODE);
    setCopied(true);
  };

  const steps: Record<SpaceSetupCreateSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.CREATE_START]: (
      <CreateStartStep
        control={control}
        displayNameError={attemptedFields.displayName ? errors.displayName : undefined}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_NAME]: (
      <CreateNameStep
        control={control}
        onContinue={continueToDateStep}
        spaceNameError={attemptedFields.spaceName ? errors.spaceName : undefined}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_DATE]: (
      <CreateDateStep
        control={firstDayControl}
        firstDayError={attemptedFields.firstDay ? errors.firstDay : undefined}
        onContinue={continueToInviteStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_INVITE]: <CreateInviteStep copied={copied} onCopy={copyInviteCode} />,
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
