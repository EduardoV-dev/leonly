"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { APP_ROUTES } from "@/constants/routes";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { INVITE_CODE } from "../../components/space-setup-container/constants";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import {
  type CreateSpaceSetupFormValues,
  useCreateSpaceSetupForm,
} from "../../hooks/use-create-space-setup-form";
import type { SpaceSetupCreateSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { waitForNextPaint } from "../../utils/wait-for-next-paint";
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
    form: { control, getValues, setError, trigger },
    hasLoaded,
    isAllowed,
  } = useCreateSpaceSetupForm(screen);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(INVITE_CODE);
    setCopied(true);
  };

  const continueToNameStep = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await waitForNextPaint();
    const isValid = await trigger("displayName");

    if (!isValid) {
      focusInvalidField("display-name");
      setIsSubmitting(false);
      return;
    }

    completeStep(SPACE_SETUP_STEPS.CREATE_START, getValues());
    router.push(APP_ROUTES.WELCOME_CREATE_STEP("name"));
  };

  const continueToDateStep = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await waitForNextPaint();
    const isValid = await trigger("spaceName");

    if (!isValid) {
      focusInvalidField("space-name");
      setIsSubmitting(false);
      return;
    }

    completeStep(SPACE_SETUP_STEPS.CREATE_NAME, getValues());
    router.push(APP_ROUTES.WELCOME_CREATE_STEP("date"));
  };

  const continueToInviteStep = async () => {
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    await waitForNextPaint();
    const isValid = await trigger("firstDay");

    if (!isValid) {
      focusInvalidField("first-day-trigger");
      setIsSubmitting(false);
      return;
    }

    const values = getValues();

    try {
      const response = await fetch("/api/spaces/create", {
        body: JSON.stringify({
          display_name: values.displayName,
          space_name: values.spaceName,
          start_date: values.firstDay,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string; field?: string };

      if (!response.ok) {
        const message = payload.error || "We could not create your space. Please try again.";

        if (payload.field === "start_date") {
          setError("firstDay", { message });
          focusInvalidField("first-day-trigger");
          setIsSubmitting(false);
          return;
        }

        throw new Error(message);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not create your space. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }

    clearState();
    globalThis.location.assign(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
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
        isSubmitting={isSubmitting}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_NAME]: (
      <CreateNameStep
        control={control}
        isSubmitting={isSubmitting}
        onContinue={continueToDateStep}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_DATE]: (
      <CreateDateStep
        control={firstDayControl}
        isSubmitting={isSubmitting}
        onContinue={continueToInviteStep}
        submitError={submitError}
      />
    ),
    [SPACE_SETUP_STEPS.CREATE_INVITE]: (
      <CreateInviteStep
        copied={copied}
        inviteCode={INVITE_CODE}
        isSubmitting={false}
        onContinue={startStory}
        onCopy={copyInviteCode}
        submitError={null}
      />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
