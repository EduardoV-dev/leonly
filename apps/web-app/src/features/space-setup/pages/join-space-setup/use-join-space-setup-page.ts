"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { api, isAxiosError } from "@/lib/axios/api";
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

async function redirectIfInviteUnavailable(
  status: number | undefined,
  failureMessage: string,
): Promise<boolean> {
  if (status !== 404) return false;

  try {
    const { data: payload } = await api.get<ApiResponse<ActiveSpace | null>>("/users/me/space");
    const hasActiveSpace = payload.data !== null;
    if (hasActiveSpace) globalThis.location.assign(APP_ROUTES.HOME);
    return hasActiveSpace;
  } catch (error) {
    const isApiError = isAxiosError(error);
    const isUnauthenticated = isApiError && error.response?.status === 401;
    if (isUnauthenticated) {
      globalThis.location.assign(APP_ROUTES.AUTH);
      return true;
    }
    throw new JoinSetupError(failureMessage, { cause: error });
  }
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
      await api.post<ApiResponse<{ valid: true }>>("/spaces/invites/validations", {
        invite_code: values.inviteCode,
      });
    } catch (error) {
      let setupFailure = error;
      const isApiError = isAxiosError<ApiResponse<null>>(error);
      const apiError = isApiError ? error : undefined;
      const status = apiError?.response?.status;
      if (status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        setIsSubmittingCode(false);
        return;
      }

      try {
        const shouldRedirect = await redirectIfInviteUnavailable(
          status,
          t("errors.validateInviteCode"),
        );
        if (shouldRedirect) return;
      } catch (lookupError) {
        setupFailure = lookupError;
      }

      const shouldWrapApiError = isApiError && !(setupFailure instanceof JoinSetupError);
      if (shouldWrapApiError) {
        setupFailure = new JoinSetupError(
          t(getInviteCodeErrorMessage(status ?? 0, "errors.validateInviteCode")),
          { cause: error },
        );
      }
      const setupError =
        setupFailure instanceof JoinSetupError
          ? setupFailure
          : new JoinSetupError(t("errors.validateInviteCode"), { cause: setupFailure });
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
      await api.post<ApiResponse<{ space_id: string }>>("/memberships", {
        display_name: values.displayName,
        invite_code: values.inviteCode,
      });
    } catch (error) {
      let setupFailure = error;
      const isApiError = isAxiosError<ApiResponse<null>>(error);
      const apiError = isApiError ? error : undefined;
      const status = apiError?.response?.status;
      if (status === 401) {
        globalThis.location.assign(APP_ROUTES.AUTH);
        setIsSubmittingJoin(false);
        return;
      }

      try {
        const shouldRedirect = await redirectIfInviteUnavailable(status, t("errors.joinSpace"));
        if (shouldRedirect) return;
      } catch (lookupError) {
        setupFailure = lookupError;
      }

      const fieldError = apiError?.response?.data?.error?.[0];
      if (fieldError?.field === "display_name") {
        setError("displayName", { message: fieldError.message || t("errors.joinSpace") });
        focusInvalidField("join-display-name");
        setIsSubmittingJoin(false);
        return;
      }

      const shouldWrapApiError = isApiError && !(setupFailure instanceof JoinSetupError);
      if (shouldWrapApiError) {
        setupFailure = new JoinSetupError(
          t(getInviteCodeErrorMessage(status ?? 0, "errors.joinSpace")),
          { cause: error },
        );
      }
      const setupError =
        setupFailure instanceof JoinSetupError
          ? setupFailure
          : new JoinSetupError(t("errors.joinSpace"), { cause: setupFailure });
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
