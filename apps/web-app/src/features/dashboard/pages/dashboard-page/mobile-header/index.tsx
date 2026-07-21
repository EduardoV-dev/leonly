import { Heart, UsersRound } from "lucide-react";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import { MemberAvatar } from "../member-avatar";
import styles from "./mobile-header.module.css";

type MobileHeaderProps = {
  member: ActiveSpace["active_members"][number];
};

export function MobileHeader({ member }: MobileHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <MemberAvatar member={member} />
        <span>Leonly</span>
      </div>
      <div className={styles.actions}>
        <button type="button" aria-label="Favorite memories">
          <Heart aria-hidden="true" />
        </button>
        <button type="button" aria-label="Our profile">
          <UsersRound aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
