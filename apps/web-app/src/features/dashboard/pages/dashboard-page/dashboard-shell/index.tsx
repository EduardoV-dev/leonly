"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import type { ActiveSpace } from "@/features/space-setup/types/active-space";
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

function getCurrentSection(pathname: string): DashboardSection {
  if (pathname === APP_ROUTES.HOME) return "dashboard";
  if (pathname.startsWith(APP_ROUTES.VAULT)) return "vault";
  if (pathname.startsWith(APP_ROUTES.SETTINGS)) return "settings";
  return "timeline";
}

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
  const currentSection = activeSection ?? getCurrentSection(pathname);

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
        <MobileHeader members={activeSpace.active_members} spaceName={activeSpace.name} />
        <DashboardSidebar
          activeSection={currentSection}
          activeSpace={activeSpace}
          isCollapsed={isSidebarCollapsed}
          onCollapsedChange={() => setIsSidebarCollapsed((current) => !current)}
        />
        <DashboardActiveSpaceContext value={activeSpace}>{children}</DashboardActiveSpaceContext>
        <MobileNavigation activeSection={currentSection} />
      </div>
    </div>
  );
}
