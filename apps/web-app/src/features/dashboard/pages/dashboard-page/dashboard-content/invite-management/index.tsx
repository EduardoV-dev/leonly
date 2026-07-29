"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import styles from "./invite-management.module.css";
import { useRegenerateInvite } from "./use-regenerate-invite";

type InviteManagementProps = {
  inviteCode: string | null;
  inviteCodeExpiresAt: string | null;
};

export function InviteManagement({ inviteCode, inviteCodeExpiresAt }: InviteManagementProps) {
  const regeneration = useRegenerateInvite();
  const code = regeneration.data?.invite_code ?? inviteCode;
  const expiresAt = regeneration.data?.invite_code_expires_at ?? inviteCodeExpiresAt;
  const automaticallyRegeneratedInvite = useRef<string | null>(null);

  const regenerateExpiredInvite = useEffectEvent(() => {
    const expirationTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;

    if (code && Number.isFinite(expirationTime) && expirationTime > Date.now()) {
      return;
    }

    const inviteKey = `${code}:${expiresAt ?? ""}`;

    if (automaticallyRegeneratedInvite.current === inviteKey) {
      return;
    }

    automaticallyRegeneratedInvite.current = inviteKey;
    regeneration.mutate();
  });

  useEffect(() => {
    const expirationTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;

    if (!Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
      regenerateExpiredInvite();
      return;
    }

    const timeout = window.setTimeout(regenerateExpiredInvite, expirationTime - Date.now());

    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  const expirationTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const isExpired = !Number.isFinite(expirationTime) || expirationTime <= Date.now();

  if (code && !isExpired) {
    return <code className={styles.code}>{formatInviteCodeDisplay(code)}</code>;
  }

  if (regeneration.isError) {
    return (
      <p role="alert" className={styles.error}>
        We could not create a new invite. Please refresh the page to try again.
      </p>
    );
  }

  return (
    <p className={styles.regeneration} role="status" aria-live="polite">
      Creating a new invite...
    </p>
  );
}
