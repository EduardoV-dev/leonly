"use client";

import Image from "next/image";
import { useState } from "react";
import type { SettingsMember } from "../../../server/get-settings-for-current-user";
import styles from "./settings-member-avatar.module.css";

type SettingsMemberAvatarProps = {
  label: string;
  member: SettingsMember;
};

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SettingsMemberAvatar({ label, member }: Readonly<SettingsMemberAvatarProps>) {
  const [hasLoadFailed, setHasLoadFailed] = useState(false);

  if (member.avatarUrl && !hasLoadFailed) {
    return (
      <Image
        className={styles.avatar}
        src={member.avatarUrl}
        alt={label}
        width={52}
        height={52}
        unoptimized
        onError={() => setHasLoadFailed(true)}
      />
    );
  }

  return (
    <span className={`${styles.avatar} ${styles.fallback}`} role="img" aria-label={label}>
      {getInitials(member.displayName)}
    </span>
  );
}
