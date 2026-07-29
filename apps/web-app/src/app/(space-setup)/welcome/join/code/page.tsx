import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SPACE_SETUP_STEPS, SpaceJoinSetupPage } from "@/features/space-setup";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { createClient } from "@/lib/supabase/server";

export default async function JoinCodePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  if (await getActiveSpaceForCurrentUser()) {
    redirect(APP_ROUTES.HOME);
  }

  return <SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />;
}
