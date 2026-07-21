import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import {
  Headphones,
  ImageIcon,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  Settings,
  Star,
} from "lucide-react";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-sidebar.module.css";

type DashboardSidebarProps = {
  activeSpace: ActiveSpace;
  startedOn: string;
};

export function DashboardSidebar({ activeSpace, startedOn }: DashboardSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.identity}>
        <div className={styles.avatars}>
          {activeSpace.active_members.map((member) => (
            <MemberAvatar key={member.display_name} member={member} size="large" />
          ))}
        </div>
        <h1>{activeSpace.name}</h1>
        <p>Since {startedOn}</p>
      </div>

      <nav className={styles.navigation} aria-label="Dashboard sections">
        <a href="#timeline">
          <MapIcon aria-hidden="true" />
          Timeline
        </a>
        <a href="#gallery">
          <ImageIcon aria-hidden="true" />
          Gallery
        </a>
        <a href="#map">
          <MapPin aria-hidden="true" />
          Map
        </a>
        <a href="#rankings">
          <Star aria-hidden="true" />
          Rankings
        </a>
        <a href="#vault">
          <LockKeyhole aria-hidden="true" />
          Private Vault
        </a>
      </nav>

      <div className={styles.footer}>
        <a href="#settings">
          <Settings aria-hidden="true" />
          Settings
        </a>
        <a href="#support">
          <Headphones aria-hidden="true" />
          Support
        </a>
      </div>
    </aside>
  );
}
