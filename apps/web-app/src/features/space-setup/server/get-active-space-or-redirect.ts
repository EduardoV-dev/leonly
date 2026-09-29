import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import {
  type ActiveSpace,
  ActiveSpaceAuthenticationError,
  getActiveSpaceForCurrentUser,
} from "./get-active-space-for-user";

export async function getActiveSpaceOrRedirectToAuth(): Promise<ActiveSpace | null> {
  try {
    return await getActiveSpaceForCurrentUser();
  } catch (error) {
    if (error instanceof ActiveSpaceAuthenticationError) {
      redirect(APP_ROUTES.AUTH);
    }

    throw error;
  }
}
