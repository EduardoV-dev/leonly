import { ProfileAvatar } from "@/components/profile-avatar";
import type { SettingsMember } from "../../../server/get-settings-for-current-user";
import styles from "./settings-member-avatar.module.css";

type SettingsMemberAvatarProps = {
  label: string;
  member: SettingsMember;
};

export function SettingsMemberAvatar({ label, member }: Readonly<SettingsMemberAvatarProps>) {
  return (
    <ProfileAvatar
      avatarUrl={member.avatarUrl}
      className={styles.avatar}
      displayName={member.displayName}
      fallbackClassName={styles.fallback}
      height={52}
      label={label}
      width={52}
    />
  );
}
