import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";
import styles from "./dashboard-page.module.css";
import { DashboardSidebar } from "./dashboard-sidebar";
import { MobileHeader } from "./mobile-header";
import { MobileNavigation } from "./mobile-navigation";

export async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logServerError({ event: "supabase_operation_failed", operation: "get_dashboard_user" }, error);
  }

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  if (activeSpace.active_members.length === 0) {
    throw new Error("The active space has no active members.");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <MobileHeader member={activeSpace.active_members[0]} />
        <DashboardSidebar activeSpace={activeSpace} />
        <DashboardContent activeSpace={activeSpace} />
        <MobileNavigation />
      </div>
    </main>
  );
}
