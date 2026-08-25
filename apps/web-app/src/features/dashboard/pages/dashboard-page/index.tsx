import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";
import { DashboardShell } from "./dashboard-shell";

type DashboardPageProps = {
  activeSection?: "dashboard" | "timeline";
  children?: ReactNode;
};

export async function DashboardPage({
  activeSection,
  children,
}: Readonly<DashboardPageProps> = {}) {
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
    <DashboardShell activeSection={activeSection} activeSpace={activeSpace}>
      {children ?? <DashboardContent activeSpace={activeSpace} />}
    </DashboardShell>
  );
}
