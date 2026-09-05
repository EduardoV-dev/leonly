"use client";

import {
  BookHeart,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/constants/routes";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import type { DashboardSection } from "../dashboard-section";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-sidebar.module.css";

type DashboardSidebarProps = {
  activeSection: DashboardSection;
  activeSpace: ActiveSpace;
  isCollapsed: boolean;
  onCollapsedChange: () => void;
};

export function DashboardSidebar({
  activeSection,
  activeSpace,
  isCollapsed,
  onCollapsedChange,
}: Readonly<DashboardSidebarProps>) {
  const collapseLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside className={styles.sidebar} data-collapsed={isCollapsed}>
      <button
        type="button"
        className={styles.collapseToggle}
        onClick={onCollapsedChange}
        aria-label={collapseLabel}
        title={collapseLabel}
      >
        {isCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </button>
      <div className={styles.identity}>
        <div className={styles.avatars}>
          {activeSpace.active_members.map((member) => (
            <MemberAvatar key={member.display_name} member={member} size="large" />
          ))}
        </div>
        <h1>{activeSpace.name}</h1>
      </div>

      <Link className={styles.newEntry} href={APP_ROUTES.MEMORIES_NEW}>
        <Plus aria-hidden="true" />
        <span className={styles.label}>New Entry</span>
      </Link>

      <nav className={styles.navigation} aria-label="Dashboard sections">
        <Link
          href={APP_ROUTES.HOME}
          aria-current={activeSection === "dashboard" ? "page" : undefined}
        >
          <LayoutGrid aria-hidden="true" />
          <span className={styles.label}>Dashboard</span>
        </Link>
        <Link
          href={APP_ROUTES.TIMELINE}
          aria-current={activeSection === "timeline" ? "page" : undefined}
        >
          <BookHeart aria-hidden="true" />
          <span className={styles.label}>Timeline</span>
        </Link>
        <button type="button" disabled>
          <MapPin aria-hidden="true" />
          <span className={styles.label}>Places</span>
        </button>
        <Link href={APP_ROUTES.VAULT} aria-current={activeSection === "vault" ? "page" : undefined}>
          <LockKeyhole aria-hidden="true" />
          <span className={styles.label}>Vault</span>
        </Link>
        <Link
          href={APP_ROUTES.SETTINGS}
          aria-current={activeSection === "settings" ? "page" : undefined}
        >
          <Settings aria-hidden="true" />
          <span className={styles.label}>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
