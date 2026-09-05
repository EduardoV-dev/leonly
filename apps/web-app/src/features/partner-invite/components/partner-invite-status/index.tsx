"use client";

import { Check, Copy, KeyRound, RefreshCw, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/shadcn-button";
import { formatInviteCodeDisplay } from "@/features/space-setup/constants/validation";
import { regeneratePartnerInvite } from "../../hooks/use-regenerate-partner-invite";
import type { InviteFeedback, InviteState } from "../../types/invite-state";
import styles from "./partner-invite-status.module.css";

const MAX_BROWSER_TIMEOUT = 2_147_483_647;

type PartnerInviteStatusProps = {
  code: string | null;
  expiresAt: string | null;
  membershipState: "one-member" | "two-member";
};

function getInviteState(
  code: string | null,
  expiresAt: string | null,
  membershipState: PartnerInviteStatusProps["membershipState"],
  now: number,
): InviteState {
  if (membershipState === "two-member") {
    return { status: "joined" };
  }

  const expirationTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;

  if (!code || !expiresAt || !Number.isFinite(expirationTime) || expirationTime <= now) {
    return { status: "unavailable" };
  }

  return { code, expiresAt, status: "valid" };
}

export function PartnerInviteStatus({
  code,
  expiresAt,
  membershipState,
}: Readonly<PartnerInviteStatusProps>) {
  const { t } = useTranslation("settings");
  const router = useRouter();
  const codeInput = useRef<HTMLInputElement>(null);
  const regenerationInFlight = useRef(false);
  const [localInvite, setLocalInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [feedback, setFeedback] = useState<InviteFeedback>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now);
  const activeCode = localInvite?.code ?? code;
  const activeExpiry = localInvite?.expiresAt ?? expiresAt;
  const inviteState = getInviteState(
    activeCode,
    activeExpiry,
    hasJoined ? "two-member" : membershipState,
    now,
  );

  useEffect(() => {
    if (inviteState.status !== "valid") {
      return;
    }

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(Date.parse(inviteState.expiresAt) - now, MAX_BROWSER_TIMEOUT),
    );

    return () => window.clearTimeout(timeout);
  }, [inviteState, now]);

  useEffect(() => {
    if (feedback?.status !== "copied") {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3_000);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const refreshAuthoritativeState = () => startTransition(() => router.refresh());

  const handleCopy = async () => {
    if (inviteState.status !== "valid") {
      return;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(inviteState.code);
      setFeedback({ status: "copied" });
    } catch {
      codeInput.current?.focus();
      codeInput.current?.select();
      setFeedback({ status: "manual-copy" });
    }
  };

  const handleRegenerate = async () => {
    if (regenerationInFlight.current || isPending) {
      return;
    }

    regenerationInFlight.current = true;
    setIsRegenerating(true);
    setFeedback(null);
    const result = await regeneratePartnerInvite();

    try {
      if (result.status === "regenerated") {
        setLocalInvite({ code: result.code, expiresAt: result.expiresAt });
        setNow(Date.now());
        setFeedback({ status: "regenerated" });
        refreshAuthoritativeState();
        return;
      }

      if (result.status === "joined") {
        setHasJoined(true);
        setFeedback({ status: "joined" });
        refreshAuthoritativeState();
        return;
      }

      if (result.status === "locked") {
        setFeedback({ retryAfter: result.retryAfter, status: "rate-limited" });
        return;
      }

      setFeedback({ status: "failed" });
      if (result.status === "unavailable") {
        refreshAuthoritativeState();
      }
    } finally {
      regenerationInFlight.current = false;
      setIsRegenerating(false);
    }
  };

  const feedbackMessage =
    feedback?.status === "manual-copy"
      ? t("inviteManagement.manualCopy")
      : feedback?.status === "regenerated"
        ? t("inviteManagement.regenerated")
        : feedback?.status === "joined"
          ? t("inviteManagement.joined")
          : feedback?.status === "rate-limited"
            ? t("inviteManagement.rateLimited", { seconds: feedback.retryAfter })
            : feedback?.status === "failed"
              ? t("inviteManagement.failed")
              : isRegenerating || isPending
                ? t("inviteManagement.pending")
                : null;

  return (
    <section className={styles.card} aria-labelledby="partner-invite-heading">
      <span className={styles.iconSeal} aria-hidden="true">
        {inviteState.status === "joined" ? <UsersRound /> : <KeyRound />}
      </span>
      <div className={styles.content}>
        <h2 id="partner-invite-heading">
          {inviteState.status === "joined"
            ? t("inviteManagement.joinedHeading")
            : t("inviteManagement.heading")}
        </h2>
        <p>
          {inviteState.status === "joined"
            ? t("inviteManagement.joinedDescription")
            : inviteState.status === "valid"
              ? t("inviteManagement.validDescription")
              : t("inviteManagement.unavailableDescription")}
        </p>

        {inviteState.status === "valid" ? (
          <div className={styles.codeControls}>
            <label className={styles.codeLabel} htmlFor="partner-invite-code">
              {t("inviteManagement.codeLabel")}
            </label>
            <input
              ref={codeInput}
              className={styles.code}
              id="partner-invite-code"
              readOnly
              value={formatInviteCodeDisplay(inviteState.code)}
            />
            <Button onClick={handleCopy} type="button" variant="outline">
              {feedback?.status === "copied" ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {feedback?.status === "copied"
                ? t("inviteManagement.copied")
                : t("inviteManagement.copy")}
            </Button>
          </div>
        ) : null}

        {inviteState.status === "unavailable" ? (
          <Button disabled={isRegenerating || isPending} onClick={handleRegenerate} type="button">
            <RefreshCw
              aria-hidden="true"
              className={isRegenerating || isPending ? styles.spinning : undefined}
            />
            {t("inviteManagement.regenerate")}
          </Button>
        ) : null}

        {feedbackMessage ? (
          <p className={styles.feedback} role="status" aria-live="polite">
            {feedback?.status === "copied" ? <Check aria-hidden="true" /> : null}
            {feedbackMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
