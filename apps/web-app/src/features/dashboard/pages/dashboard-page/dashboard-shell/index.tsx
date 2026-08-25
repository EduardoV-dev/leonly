"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import styles from "../dashboard-page.module.css";
import { DashboardSidebar } from "../dashboard-sidebar";
import { MobileHeader } from "../mobile-header";
import { MobileNavigation } from "../mobile-navigation";

type DashboardShellProps = {
  activeSection?: "dashboard" | "timeline";
  activeSpace: ActiveSpace;
  children: ReactNode;
};

export function DashboardShell({
  activeSection,
  activeSpace,
  children,
}: Readonly<DashboardShellProps>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const currentSection = activeSection ?? (pathname === "/" ? "dashboard" : "timeline");

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
        {children}
        <MobileNavigation activeSection={currentSection} />
      </div>
    </main>
  );
}
