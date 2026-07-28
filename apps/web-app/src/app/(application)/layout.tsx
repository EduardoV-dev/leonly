import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { hasActiveSpaceForCurrentUser } from "@/features/space-setup/server/has-active-space-for-user";
import { createClient } from "@/lib/supabase/server";

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({ children }: Readonly<ApplicationLayoutProps>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  if (!(await hasActiveSpaceForCurrentUser())) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  return children;
}
