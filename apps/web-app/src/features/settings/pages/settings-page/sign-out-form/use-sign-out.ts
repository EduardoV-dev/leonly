import { useActionState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { authClient } from "@/features/auth/api/auth-client";

type SignOutState = { status: "error" | "idle" };

export function useSignOut(): [state: SignOutState, action: () => void, isPending: boolean] {
  return useActionState<SignOutState>(
    async (_state: SignOutState): Promise<SignOutState> => {
      try {
        const result = await authClient.signOut();
        if (result.error) return { status: "error" };
      } catch {
        return { status: "error" };
      }
      globalThis.location.assign(APP_ROUTES.AUTH);
      return { status: "idle" };
    },
    { status: "idle" },
  );
}
