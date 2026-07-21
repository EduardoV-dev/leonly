import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import styles from "./member-avatar.module.css";

type MemberAvatarProps = {
  member: ActiveSpace["active_members"][number];
  size?: "small" | "medium" | "large";
};

export function MemberAvatar({ member, size = "small" }: MemberAvatarProps) {
  const className = `${styles.avatar} ${styles[size]}`;
  const label = `${member.display_name}'s avatar`;

  if (member.avatar_url) {
    return <img className={className} src={member.avatar_url} alt={label} />;
  }

  return (
    <span className={`${className} ${styles.fallback}`} role="img" aria-label={label}>
      {member.display_name.charAt(0).toUpperCase()}
    </span>
  );
}
