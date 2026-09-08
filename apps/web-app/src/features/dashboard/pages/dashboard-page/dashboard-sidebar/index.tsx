"use client";

import {
  BookHeart,
  ImagePlus,
  LayoutGrid,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("dashboard");
  const collapseLabel = isCollapsed ? t("navigation.expand") : t("navigation.collapse");

  return (
    <aside className={styles.sidebar} data-collapsed={isCollapsed}>
      <div className={styles.content}>
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

        <Link
          className={styles.newEntry}
          href={APP_ROUTES.MEMORIES_NEW}
          title={isCollapsed ? t("navigation.newEntry") : undefined}
        >
          <ImagePlus aria-hidden="true" />
          <span className={styles.label}>{t("navigation.newEntry")}</span>
        </Link>

        <nav className={styles.navigation} aria-label={t("navigation.sections")}>
          <Link
            href={APP_ROUTES.HOME}
            aria-current={activeSection === "dashboard" ? "page" : undefined}
            title={isCollapsed ? t("navigation.dashboard") : undefined}
          >
            <LayoutGrid aria-hidden="true" />
            <span className={styles.label}>{t("navigation.dashboard")}</span>
          </Link>
          <Link
            href={APP_ROUTES.TIMELINE}
            aria-current={activeSection === "timeline" ? "page" : undefined}
            title={isCollapsed ? t("navigation.timeline") : undefined}
          >
            <BookHeart aria-hidden="true" />
            <span className={styles.label}>{t("navigation.timeline")}</span>
          </Link>
          <Link
            href={APP_ROUTES.VAULT}
            aria-current={activeSection === "vault" ? "page" : undefined}
            title={isCollapsed ? t("navigation.vault") : undefined}
          >
            <LockKeyhole aria-hidden="true" />
            <span className={styles.label}>{t("navigation.vault")}</span>
          </Link>
          <Link
            href={APP_ROUTES.SETTINGS}
            aria-current={activeSection === "settings" ? "page" : undefined}
            title={isCollapsed ? t("navigation.settings") : undefined}
          >
            <Settings aria-hidden="true" />
            <span className={styles.label}>{t("navigation.settings")}</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
