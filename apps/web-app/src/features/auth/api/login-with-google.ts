import { useMutation } from "@tanstack/react-query";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";
import { APP_ROUTES } from "@/constants/routes";
import { authClient } from "./auth-client";

function getAuthUrl(path: string, siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "") || window.location.origin;

  return `${origin}${path}`;
}

export function getGoogleAuthReturnUrl(
  siteUrl: string = ENVIRONMENT_VARIABLES.NEXT_PUBLIC_SITE_URL,
): string {
  return getAuthUrl(APP_ROUTES.WELCOME_CREATE_STEP("start"), siteUrl);
}

function getGoogleAuthErrorUrl(
  siteUrl: string = ENVIRONMENT_VARIABLES.NEXT_PUBLIC_SITE_URL,
): string {
  return getAuthUrl("/auth/auth-code-error", siteUrl);
}

export const loginWithGoogle = async () => {
  const { data, error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: getGoogleAuthReturnUrl(),
    errorCallbackURL: getGoogleAuthErrorUrl(),
  });

  if (error) {
    throw error;
  }

  return data;
};

export const useLoginWithGoogle = () => {
  return useMutation({
    mutationFn: loginWithGoogle,
  });
};
