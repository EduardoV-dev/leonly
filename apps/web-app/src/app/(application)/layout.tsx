import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { APP_ROUTES } from "@/constants/routes";
import {
  type ActiveSpace,
  ActiveSpaceAuthenticationError,
  getActiveSpaceForCurrentUser,
} from "@/features/space-setup/server/get-active-space-for-user";

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({ children }: Readonly<ApplicationLayoutProps>) {
  let activeSpace: ActiveSpace | null;
  try {
    activeSpace = await getActiveSpaceForCurrentUser();
    if (!activeSpace) {
      redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
    }
  } catch (error) {
    if (error instanceof ActiveSpaceAuthenticationError) redirect(APP_ROUTES.AUTH);
    throw error;
  }

  return children;
}
