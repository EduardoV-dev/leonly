"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { useJoinSpaceSetupForm } from "../../hooks/use-join-space-setup-form";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";

type AttemptedJoinFields = {
  inviteCode: boolean;
  displayName: boolean;
};

type SpaceJoinSetupPageProps = {
  screen: SpaceSetupJoinSteps;
};

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps) {
  const router = useRouter();
  const {
    formState: { errors },
    trigger,
    control,
  } = useJoinSpaceSetupForm();
  const [attemptedFields, setAttemptedFields] = useState<AttemptedJoinFields>({
    inviteCode: false,
    displayName: false,
  });
  const continueToNameStep = async () => {
    setAttemptedFields((current) => ({ ...current, inviteCode: true }));
    const isValid = await trigger("inviteCode");

    if (isValid) {
      router.push(APP_ROUTES.WELCOME_JOIN_STEP("name"));
    }
  };

  const continueToHome = async () => {
    setAttemptedFields((current) => ({ ...current, displayName: true }));
    const isValid = await trigger("displayName");

    if (isValid) {
      router.push(APP_ROUTES.HOME);
    }
  };

  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: (
      <JoinCodeStep
        control={control}
        inviteCodeError={attemptedFields.inviteCode ? errors.inviteCode : undefined}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        control={control}
        displayNameError={attemptedFields.displayName ? errors.displayName : undefined}
        onContinue={continueToHome}
      />
    ),
  };

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
