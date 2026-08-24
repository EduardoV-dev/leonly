import { BookHeart, LayoutGrid, LockKeyhole, MapPin, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/constants/routes";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-sidebar.module.css";

type DashboardSidebarProps = {
  activeSection: "dashboard" | "timeline";
  activeSpace: ActiveSpace;
};

export function DashboardSidebar({ activeSection, activeSpace }: Readonly<DashboardSidebarProps>) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.identity}>
        <div className={styles.avatars}>
          {activeSpace.active_members.map((member) => (
            <MemberAvatar key={member.display_name} member={member} size="large" />
          ))}
        </div>
        <h1>{activeSpace.name}</h1>
      </div>

      <Link className={styles.newEntry} href={APP_ROUTES.TIMELINE_NEW}>
        <Plus aria-hidden="true" />
        New Entry
      </Link>

      <nav className={styles.navigation} aria-label="Dashboard sections">
        <Link
          href={APP_ROUTES.HOME}
          aria-current={activeSection === "dashboard" ? "page" : undefined}
        >
          <LayoutGrid aria-hidden="true" />
          Dashboard
        </Link>
        <Link
          href={APP_ROUTES.TIMELINE}
          aria-current={activeSection === "timeline" ? "page" : undefined}
        >
          <BookHeart aria-hidden="true" />
          Timeline
        </Link>
        <button type="button" disabled>
          <MapPin aria-hidden="true" />
          Places
        </button>
        <button type="button" disabled>
          <LockKeyhole aria-hidden="true" />
          Vault
        </button>
        <button type="button" disabled>
          <Settings aria-hidden="true" />
          Settings
        </button>
      </nav>
    </aside>
  );
}
