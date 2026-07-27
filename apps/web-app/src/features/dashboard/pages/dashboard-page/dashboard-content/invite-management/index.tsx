"use client";

import { useEffect, useState } from "react";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import styles from "./invite-management.module.css";

type InviteManagementProps = {
  inviteCode: string | null;
  inviteCodeExpiresAt: string | null;
};

type InviteResponse = {
  error?: string;
  invite_code?: string;
  invite_code_expires_at?: string;
};

export function InviteManagement({ inviteCode, inviteCodeExpiresAt }: InviteManagementProps) {
  const [code, setCode] = useState(inviteCode);
  const [expiresAt, setExpiresAt] = useState(inviteCodeExpiresAt);
  const [, setExpirationVersion] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const remainingMilliseconds = Date.parse(expiresAt) - Date.now();

    if (remainingMilliseconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(
      () => setExpirationVersion((version) => version + 1),
      remainingMilliseconds,
    );

    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  const regenerateInvite = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/spaces/invite/regenerate", { method: "POST" });
      const payload = (await response.json()) as InviteResponse;

      if (!response.ok || !payload.invite_code || !payload.invite_code_expires_at) {
        throw new Error(payload.error || "We could not create a new invite. Please try again.");
      }

      setCode(payload.invite_code);
      setExpiresAt(payload.invite_code_expires_at);
    } catch (regenerationError) {
      setError(
        regenerationError instanceof Error
          ? regenerationError.message
          : "We could not create a new invite. Please try again.",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const isExpired = !expiresAt || Date.parse(expiresAt) <= Date.now();

  if (code && !isExpired) {
    return <code className={styles.code}>{formatInviteCodeDisplay(code)}</code>;
  }

  return (
    <div className={styles.regeneration}>
      {code && isExpired ? (
        <p className={styles.expired}>
          Your previous invite code has expired. Create a new one to share.
        </p>
      ) : null}
      <button type="button" disabled={isRegenerating} onClick={regenerateInvite}>
        {isRegenerating ? "Creating invite..." : "Create a new invite"}
      </button>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
