"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { normalizeInviteCode } from "../../constants/validation";
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

type SpaceCreateSetupPageProps = Readonly<{
  inviteCode?: string | null;
  screen: SpaceSetupCreateSteps;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function SpaceCreateSetupPage({ inviteCode = null, screen }: SpaceCreateSetupPageProps) {
  const router = useRouter();
  const { t } = useTranslation("spaceSetup");
  const {
    clearState,
    completeStep,
    form: { control, getValues, setError, trigger },
    hasLoaded,
    isAllowed,
  } = useCreateSpaceSetupForm(screen);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const response = await fetch("/api/spaces", {
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

      const payload: unknown = await response.json();

      if (!response.ok) {
        const errors = isRecord(payload) && Array.isArray(payload.error) ? payload.error : [];
        const startDateError = errors.find(
          (error: unknown) => isRecord(error) && error.field === "start_date",
        );
        const validationError = errors.find(
          (error: unknown) => isRecord(error) && typeof error.message === "string",
        );
        const message =
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : t("errors.createSpace");

        if (isRecord(startDateError)) {
          setError("firstDay", {
            message: typeof startDateError.message === "string" ? startDateError.message : message,
          });
          focusInvalidField("first-day-trigger");
          setIsSubmitting(false);
          return;
        }

        throw new Error(
          response.status === 400 && isRecord(validationError)
            ? String(validationError.message)
            : message,
        );
      }

      const isCreatedSpace =
        isRecord(payload) &&
        payload.ok === true &&
        isRecord(payload.data) &&
        typeof payload.data.space_id === "string";
      if (!isCreatedSpace) {
        throw new Error(t("errors.createSpace"));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("errors.createSpace"));
      setIsSubmitting(false);
      return;
    }

    clearState();
    globalThis.location.assign(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
  };

  const copyInviteCode = async () => {
    if (!inviteCode) {
      return;
    }

    await navigator.clipboard.writeText(normalizeInviteCode(inviteCode));
    setCopied(true);
  };

  const startStory = () => {
    clearState();
    globalThis.location.assign(APP_ROUTES.HOME);
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
        inviteCode={inviteCode}
        onContinue={startStory}
        onCopy={copyInviteCode}
      />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
