"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import styles from "../dashboard-page.module.css";
import type { DashboardSection } from "../dashboard-section";
import { DashboardSidebar } from "../dashboard-sidebar";
import { MobileHeader } from "../mobile-header";
import { MobileNavigation } from "../mobile-navigation";

type DashboardShellProps = {
  activeSection?: DashboardSection;
  activeSpace: ActiveSpace;
  children: ReactNode;
};

const DashboardActiveSpaceContext = createContext<ActiveSpace | null>(null);

export function useDashboardActiveSpace(): ActiveSpace {
  const activeSpace = useContext(DashboardActiveSpaceContext);

  if (!activeSpace) {
    throw new Error("Dashboard content must be rendered inside the dashboard shell.");
  }

  return activeSpace;
}

export function DashboardShell({
  activeSection,
  activeSpace,
  children,
}: Readonly<DashboardShellProps>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const currentSection =
    activeSection ??
    (pathname === APP_ROUTES.HOME
      ? "dashboard"
      : pathname.startsWith(APP_ROUTES.VAULT)
        ? "vault"
        : pathname.startsWith(APP_ROUTES.SETTINGS)
          ? "settings"
          : "timeline");

  return (
    <main className={styles.page}>
      <div className={`${styles.shell} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
        <MobileHeader member={activeSpace.active_members[0]} spaceName={activeSpace.name} />
        <DashboardSidebar
          activeSection={currentSection}
          activeSpace={activeSpace}
          isCollapsed={isSidebarCollapsed}
          onCollapsedChange={() => setIsSidebarCollapsed((current) => !current)}
        />
        <DashboardActiveSpaceContext value={activeSpace}>{children}</DashboardActiveSpaceContext>
        <MobileNavigation activeSection={currentSection} />
      </div>
    </main>
  );
}
