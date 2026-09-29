import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceOrRedirectToAuth } from "@/features/space-setup/server/get-active-space-or-redirect";
import { DashboardContent } from "./dashboard-content";
import type { DashboardSection } from "./dashboard-section";
import { DashboardShell } from "./dashboard-shell";

type DashboardPageProps = {
  activeSection?: DashboardSection;
  children?: ReactNode;
};

export async function DashboardPage({
  activeSection,
  children,
}: Readonly<DashboardPageProps> = {}) {
  const activeSpace = await getActiveSpaceOrRedirectToAuth();
  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  return (
    <DashboardShell activeSection={activeSection} activeSpace={activeSpace}>
      {children ?? <DashboardContent />}
    </DashboardShell>
  );
}
