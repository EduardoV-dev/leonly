import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = ENVIRONMENT_VARIABLES;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => {
        return cookieStore.getAll();
      },
      setAll: (cookiesToSet, _headers) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
