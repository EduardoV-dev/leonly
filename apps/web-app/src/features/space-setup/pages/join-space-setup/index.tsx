"use client";

import { APP_ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { JOIN_SPACE_STORAGE_KEY } from "../../constants/local-storage";
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
    completeStep,
    form: {
      control,
      formState: { errors },
      setError,
      getValues,
      trigger,
    },
    hasLoaded,
    isAllowed,
  } = useJoinSpaceSetupForm(screen);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);

  const continueToNameStep = async () => {
    const isValid = await trigger("inviteCode");

    if (!isValid) {
      focusInvalidField("invite-code");
      return;
    }

    const values = getValues();
    setIsSubmittingCode(true);
    try {
      const response = await fetch("/api/spaces/join/validate", {
        body: JSON.stringify({ invite_code: values.inviteCode }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          payload.error || "We could not validate the invite code. Please try again.",
        );
      }
    } catch (error) {
      setError("inviteCode", {
        message:
          error instanceof Error
            ? error.message
            : "We could not validate the invite code. Please try again.",
      });
      focusInvalidField("invite-code");
      setIsSubmittingCode(false);
      return;
    }

    completeStep(SPACE_SETUP_STEPS.JOIN_CODE, values);
    router.push(APP_ROUTES.WELCOME_JOIN_STEP("name"));
  };

  const startStory = async () => {
    const isValid = await trigger("displayName");

    if (!isValid) {
      focusInvalidField("join-display-name");
      return;
    }

    const values = getValues();
    setIsSubmittingJoin(true);
    try {
      const response = await fetch("/api/spaces/join", {
        body: JSON.stringify({
          display_name: values.displayName,
          invite_code: values.inviteCode,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "We could not join this space. Please try again.");
      }
    } catch (error) {
      setError("displayName", {
        message:
          error instanceof Error
            ? error.message
            : "We could not join this space. Please try again.",
      });
      focusInvalidField("join-display-name");
      setIsSubmittingJoin(false);
      return;
    }

    window.sessionStorage.removeItem(JOIN_SPACE_STORAGE_KEY);
    globalThis.location.assign(APP_ROUTES.HOME);
  };

  const steps: Record<SpaceSetupJoinSteps, ReactNode> = {
    [SPACE_SETUP_STEPS.JOIN_CODE]: (
      <JoinCodeStep
        control={control}
        inviteCodeError={errors.inviteCode}
        isSubmitting={isSubmittingCode}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        control={control}
        displayNameError={errors.displayName}
        isSubmitting={isSubmittingJoin}
        onStartStory={startStory}
      />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
