import { createBrowserClient } from "@supabase/ssr";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = ENVIRONMENT_VARIABLES;

export const createClient = () =>
  createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      flowType: "pkce",
    },
  });
