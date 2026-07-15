import { APP_ROUTES } from "@/constants/routes";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import { CreateSpaceInvitePage } from "@/features/space-setup/pages/create-space-invite";
import { getActiveSpaceForUser } from "@/features/space-setup/server/get-active-space-for-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CreateInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  const activeSpace = await getActiveSpaceForUser(user.id);

  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  if (!activeSpace.invite_code) {
    throw new Error("Invite code is missing for the active space.");
  }

  return (
    <CreateSpaceInvitePage
      inviteCode={formatInviteCodeDisplay(activeSpace.invite_code)}
      spaceName={activeSpace.name}
    />
  );
}
