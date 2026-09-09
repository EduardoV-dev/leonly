import { ProfileAvatar } from "@/components/profile-avatar";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import styles from "./member-avatar.module.css";

type MemberAvatarProps = {
  member: ActiveSpace["active_members"][number];
  size?: "small" | "medium" | "large";
};

export function MemberAvatar({ member, size = "small" }: MemberAvatarProps) {
  const className = `${styles.avatar} ${styles[size]}`;
  const label = `${member.display_name}'s avatar`;
  const dimension = size === "small" ? 32 : size === "medium" ? 45 : 72;

  return (
    <ProfileAvatar
      avatarUrl={member.avatar_url}
      className={className}
      displayName={member.display_name}
      fallbackClassName={styles.fallback}
      height={dimension}
      label={label}
      width={dimension}
    />
  );
}
