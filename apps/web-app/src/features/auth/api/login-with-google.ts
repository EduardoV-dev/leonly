import { createClient } from "@/lib/supabase/client";
import { useMutation } from "@tanstack/react-query";

const loginWithGoogle = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
