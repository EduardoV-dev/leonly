import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForUser } from "@/features/space-setup/server/get-active-space-for-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
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

  return <main>hello</main>;
}
