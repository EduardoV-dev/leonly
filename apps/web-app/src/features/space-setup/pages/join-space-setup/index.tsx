"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS } from "../..";
import { SpaceSetupContainer } from "../../components/space-setup-container";
import { JOIN_SPACE_STORAGE_KEY } from "../../constants/local-storage";
import { useJoinSpaceSetupForm } from "../../hooks/use-join-space-setup-form";
import type { JoinApiResponse } from "../../types/join-api-response";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { waitForNextPaint } from "../../utils/wait-for-next-paint";
import { JoinCodeStep } from "./join-code-step";
import { JoinNameStep } from "./join-name-step";

type SpaceJoinSetupPageProps = {
  screen: SpaceSetupJoinSteps;
};

function getInviteCodeErrorMessage(status: number, fallback: string): string {
  if (status === 400) {
    return "errors.invalidInviteCode";
  }

  if (status === 404) {
    return "errors.inviteUnavailable";
  }

  if (status === 429) {
    return "errors.joinRateLimited";
  }

  return fallback;
}

export function SpaceJoinSetupPage({ screen }: SpaceJoinSetupPageProps) {
  const router = useRouter();
  const { t } = useTranslation("spaceSetup");
  const {
    completeStep,
    form: { control, setError, getValues, trigger },
    hasLoaded,
    isAllowed,
  } = useJoinSpaceSetupForm(screen);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const continueToNameStep = async () => {
    if (isSubmittingCode) {
      return;
    }

    setIsSubmittingCode(true);
    await waitForNextPaint();
    const isValid = await trigger("inviteCode");

    if (!isValid) {
      focusInvalidField("invite-code");
      setIsSubmittingCode(false);
      return;
    }

    const values = getValues();
    try {
      const response = await fetch("/api/spaces/invite-validations", {
        body: JSON.stringify({ invite_code: values.inviteCode }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload: JoinApiResponse<{ valid: true }> = await response.json();
      const isInviteValid = response.ok && payload.ok && payload.data?.valid;
      if (!isInviteValid) {
        throw new Error(t(getInviteCodeErrorMessage(response.status, "errors.validateInviteCode")));
      }
    } catch (error) {
      setError("inviteCode", {
        message: error instanceof Error ? error.message : t("errors.validateInviteCode"),
      });
      focusInvalidField("invite-code");
      setIsSubmittingCode(false);
      return;
    }

    completeStep(SPACE_SETUP_STEPS.JOIN_CODE, values);
    router.push(APP_ROUTES.WELCOME_JOIN_STEP("name"));
  };

  const startStory = async () => {
    if (isSubmittingJoin) {
      return;
    }

    setSubmitError(null);
    setIsSubmittingJoin(true);
    await waitForNextPaint();
    const isValid = await trigger("displayName");

    if (!isValid) {
      focusInvalidField("join-display-name");
      setIsSubmittingJoin(false);
      return;
    }

    const values = getValues();
    try {
      const response = await fetch("/api/spaces/memberships", {
        body: JSON.stringify({
          display_name: values.displayName,
          invite_code: values.inviteCode,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload: JoinApiResponse<{ space_id: string }> = await response.json();
      const fieldError = payload.error[0];
      const hasDisplayNameError = !response.ok && fieldError?.field === "display_name";
      if (hasDisplayNameError) {
        setError("displayName", { message: fieldError.message || t("errors.joinSpace") });
        focusInvalidField("join-display-name");
        setIsSubmittingJoin(false);
        return;
      }
      const isJoinSuccessful = response.ok && payload.ok && Boolean(payload.data?.space_id);
      if (!isJoinSuccessful) {
        throw new Error(t(getInviteCodeErrorMessage(response.status, "errors.joinSpace")));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("errors.joinSpace"));
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
        isSubmitting={isSubmittingCode}
        onContinue={continueToNameStep}
      />
    ),
    [SPACE_SETUP_STEPS.JOIN_NAME]: (
      <JoinNameStep
        control={control}
        isSubmitting={isSubmittingJoin}
        onStartStory={startStory}
        submitError={submitError}
      />
    ),
  };

  if (!hasLoaded || !isAllowed) {
    return null;
  }

  return <SpaceSetupContainer screen={screen}>{steps[screen]}</SpaceSetupContainer>;
}
