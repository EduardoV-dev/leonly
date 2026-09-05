import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { SettingsPage } from "@/features/settings/pages/settings-page";
import { getSettingsForCurrentUser } from "@/features/settings/server/get-settings-for-current-user";

export default async function Page() {
  const result = await getSettingsForCurrentUser();

  if (result.status === "unauthenticated") {
    redirect(APP_ROUTES.AUTH);
  }

  if (result.status === "no-active-space") {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  return <SettingsPage settings={result.settings} />;
}
