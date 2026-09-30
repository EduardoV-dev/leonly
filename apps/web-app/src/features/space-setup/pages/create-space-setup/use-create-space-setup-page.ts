"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import type { ApiResponse } from "@/types/api-response";
import { normalizeInviteCode } from "../../constants/validation";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import {
  type CreateSpaceSetupFormValues,
  useCreateSpaceSetupForm,
} from "../../hooks/use-create-space-setup-form";
import type { SpaceSetupCreateSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { waitForNextPaint } from "../../utils/wait-for-next-paint";

type CreateSpaceSetupPageOptions = Readonly<{
  inviteCode: string | null;
  screen: SpaceSetupCreateSteps;
}>;

type CreateSpaceSetupPageState = {
  control: Control<CreateSpaceSetupFormValues>;
  copied: boolean;
  hasLoaded: boolean;
  isAllowed: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  handleContinueToNameStep: () => Promise<void>;
  handleContinueToDateStep: () => Promise<void>;
  handleContinueToInviteStep: () => Promise<void>;
  handleCopyInviteCode: () => Promise<void>;
  handleCompleteSetup: () => Promise<void>;
};

export function useCreateSpaceSetupPage({
  inviteCode,
  screen,
}: CreateSpaceSetupPageOptions): CreateSpaceSetupPageState {
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

  const handleContinueToNameStep = async () => {
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

  const handleContinueToDateStep = async () => {
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

  const handleContinueToInviteStep = async () => {
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

      if (response.status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        return;
      }

      if (response.status === 409) {
        globalThis.location.assign(APP_ROUTES.HOME);
        return;
      }

      const payload: ApiResponse<{ space_id: string }> = await response.json();

      if (!response.ok) {
        const startDateError = payload.error.find((error) => error.field === "start_date");
        const validationError = payload.error[0];
        const message = payload.message || t("errors.createSpace");

        if (startDateError) {
          setError("firstDay", {
            message: startDateError.message || message,
          });
          focusInvalidField("first-day-trigger");
          setIsSubmitting(false);
          return;
        }

        const hasValidationError = response.status === 400 && Boolean(validationError);
        throw new Error(hasValidationError ? validationError.message : message);
      }

      const isCreatedSpace = payload.ok && Boolean(payload.data?.space_id);
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

  const handleCopyInviteCode = async () => {
    if (!inviteCode) {
      return;
    }

    await navigator.clipboard.writeText(normalizeInviteCode(inviteCode));
    setCopied(true);
  };

  const handleCompleteSetup = async () => {
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/spaces/memberships/onboarding", { method: "POST" });
      if (response.status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        return;
      }
      if (!response.ok) {
        throw new Error(t("errors.completeSetup"));
      }
    } catch {
      setSubmitError(t("errors.completeSetup"));
      setIsSubmitting(false);
      return;
    }

    clearState();
    globalThis.location.assign(APP_ROUTES.HOME);
  };

  return {
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
  };
}
