"use client";

import Image from "next/image";
import { useState } from "react";

type ProfileAvatarProps = {
  avatarUrl: string | null;
  className: string;
  displayName: string;
  fallbackClassName: string;
  height: number;
  label: string;
  width: number;
};

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ProfileAvatar({
  avatarUrl,
  className,
  displayName,
  fallbackClassName,
  height,
  label,
  width,
}: Readonly<ProfileAvatarProps>) {
  const [hasLoadFailed, setHasLoadFailed] = useState(false);

  if (avatarUrl && !hasLoadFailed) {
    return (
      <Image
        className={className}
        src={avatarUrl}
        alt={label}
        width={width}
        height={height}
        unoptimized
        onError={() => setHasLoadFailed(true)}
      />
    );
  }

  return (
    <span className={`${className} ${fallbackClassName}`} role="img" aria-label={label}>
      {getInitials(displayName)}
    </span>
  );
}
