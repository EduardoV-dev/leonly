"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { webAppApi } from "@/lib/axios/web-app-api";
import type { ApiResponse } from "@/types/api-response";
import { JOIN_SPACE_STORAGE_KEY } from "../../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import {
  type JoinSpaceSetupFormValues,
  useJoinSpaceSetupForm,
} from "../../hooks/use-join-space-setup-form";
import type { ActiveSpace } from "../../types/active-space";
import type { SpaceSetupJoinSteps } from "../../types/setup-types";
import { focusInvalidField } from "../../utils/focus-invalid-field";
import { waitForNextPaint } from "../../utils/wait-for-next-paint";

type JoinSpaceSetupPageState = {
  control: Control<JoinSpaceSetupFormValues>;
  hasLoaded: boolean;
  isAllowed: boolean;
  isSubmittingCode: boolean;
  isSubmittingJoin: boolean;
  submitError: string | null;
  handleContinueToNameStep: () => Promise<void>;
  handleJoinSpace: () => Promise<void>;
};

class JoinSetupError extends Error {}

async function redirectIfMembershipExists(failureMessage: string): Promise<boolean> {
  const response = await webAppApi.get<ApiResponse<ActiveSpace>>("/users/me/space");
  if (response.status === 401) {
    globalThis.location.assign(APP_ROUTES.AUTH);
    return true;
  }
  if (response.status < 200 || response.status >= 300) {
    throw new JoinSetupError(failureMessage);
  }

  const payload = response.data;
  if (!payload.ok) {
    throw new JoinSetupError(failureMessage);
  }

  const hasActiveSpace = payload.data !== null;

  if (hasActiveSpace) {
    globalThis.location.assign(APP_ROUTES.HOME);
  }

  return hasActiveSpace;
}

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

export function useJoinSpaceSetupPage(screen: SpaceSetupJoinSteps): JoinSpaceSetupPageState {
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

  const handleContinueToNameStep = async () => {
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
      const response = await webAppApi.post<ApiResponse<{ valid: true }>>(
        "/spaces/invite-validations",
        { invite_code: values.inviteCode },
      );

      if (response.status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        return;
      }

      const payload = response.data;
      const isInviteUnavailable = response.status === 404;
      const shouldRedirect = isInviteUnavailable
        ? await redirectIfMembershipExists(t("errors.validateInviteCode"))
        : false;
      if (shouldRedirect) return;

      const isInviteValid = response.status === 200 && payload.ok && payload.data?.valid;
      if (!isInviteValid) {
        throw new JoinSetupError(
          t(getInviteCodeErrorMessage(response.status, "errors.validateInviteCode")),
        );
      }
    } catch (error) {
      const setupError =
        error instanceof JoinSetupError
          ? error
          : new JoinSetupError(t("errors.validateInviteCode"), { cause: error });
      setError("inviteCode", {
        message: setupError.message,
      });
      focusInvalidField("invite-code");
      setIsSubmittingCode(false);
      return;
    }

    completeStep(SPACE_SETUP_STEPS.JOIN_CODE, values);
    router.push(APP_ROUTES.WELCOME_JOIN_STEP("name"));
  };

  const handleJoinSpace = async () => {
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
      const response = await webAppApi.post<ApiResponse<{ space_id: string }>>(
        "/spaces/memberships",
        {
          display_name: values.displayName,
          invite_code: values.inviteCode,
        },
      );
      if (response.status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        return;
      }

      const payload = response.data;
      const isInviteUnavailable = response.status === 404;
      const shouldRedirect = isInviteUnavailable
        ? await redirectIfMembershipExists(t("errors.joinSpace"))
        : false;
      if (shouldRedirect) return;

      const fieldError = payload.error[0];
      const hasDisplayNameError = response.status !== 200 && fieldError?.field === "display_name";
      if (hasDisplayNameError) {
        setError("displayName", { message: fieldError.message || t("errors.joinSpace") });
        focusInvalidField("join-display-name");
        setIsSubmittingJoin(false);
        return;
      }
      const isJoinSuccessful =
        response.status === 200 && payload.ok && Boolean(payload.data?.space_id);
      if (!isJoinSuccessful) {
        throw new JoinSetupError(t(getInviteCodeErrorMessage(response.status, "errors.joinSpace")));
      }
    } catch (error) {
      const setupError =
        error instanceof JoinSetupError
          ? error
          : new JoinSetupError(t("errors.joinSpace"), { cause: error });
      setSubmitError(setupError.message);
      setIsSubmittingJoin(false);
      return;
    }

    window.sessionStorage.removeItem(JOIN_SPACE_STORAGE_KEY);
    globalThis.location.assign(APP_ROUTES.HOME);
  };

  return {
    control,
    hasLoaded,
    isAllowed,
    isSubmittingCode,
    isSubmittingJoin,
    submitError,
    handleContinueToNameStep,
    handleJoinSpace,
  };
}
