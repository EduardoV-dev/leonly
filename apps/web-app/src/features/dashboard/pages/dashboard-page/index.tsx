import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
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
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  if (!activeSpace.onboarding_completed_at) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
  }

  if (activeSpace.active_members.length === 0) {
    throw new Error("The active space has no active members.");
  }

  const daysTogether = Math.max(
    0,
    differenceInCalendarDays(new Date(), parseISO(activeSpace.start_date)),
  );
  const startedOn = format(parseISO(activeSpace.start_date), "MMMM yyyy");

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <MobileHeader member={activeSpace.active_members[0]} />
        <DashboardSidebar activeSpace={activeSpace} startedOn={startedOn} />
        <DashboardContent activeSpace={activeSpace} daysTogether={daysTogether} />
        <MobileNavigation />
      </div>
    </main>
  );
}
