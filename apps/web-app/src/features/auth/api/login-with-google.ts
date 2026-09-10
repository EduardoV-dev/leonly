import { useMutation } from "@tanstack/react-query";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";
import { createClient } from "@/lib/supabase/client";

export function getGoogleAuthCallbackUrl(
  siteUrl: string = ENVIRONMENT_VARIABLES.NEXT_PUBLIC_SITE_URL,
): string {
  const origin = siteUrl.replace(/\/+$/, "") || window.location.origin;

  return `${origin}/auth/callback`;
}

const loginWithGoogle = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getGoogleAuthCallbackUrl(),
      queryParams: {
        prompt: "consent",
        access_type: "offline",
      },
    },
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
