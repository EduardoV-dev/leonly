import { Plus } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/constants/routes";
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
      <Link className={styles.actions} href={APP_ROUTES.TIMELINE_NEW}>
        <Plus aria-hidden="true" />
        <span>New Entry</span>
      </Link>
    </header>
  );
}
