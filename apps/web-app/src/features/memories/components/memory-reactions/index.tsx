"use client";

import { SmilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMemoryReaction } from "../../hooks/use-memory-reaction";
import {
  MEMORY_REACTION_TYPES,
  type MemoryReactionSummary,
  type MemoryReactionType,
} from "../../types/memory-reaction";
import styles from "./memory-reactions.module.css";

type MemoryReactionsProps = {
  memoryId: string;
  reaction: MemoryReactionSummary;
};

const reactionIcons: Record<MemoryReactionType, string> = {
  cry: "😢",
  heart: "❤️",
  laugh: "😂",
  star: "⭐",
};

function applyReaction(
  summary: MemoryReactionSummary,
  reactionType: MemoryReactionType,
): MemoryReactionSummary {
  const currentReaction = summary.currentReaction;
  const counts = { ...summary.counts };

  if (currentReaction === reactionType) {
    counts[reactionType] = Math.max(0, counts[reactionType] - 1);
    return { ...summary, counts, currentReaction: null };
  }

  if (currentReaction) counts[currentReaction] = Math.max(0, counts[currentReaction] - 1);
  counts[reactionType] += 1;
  return { ...summary, counts, currentReaction: reactionType };
}

export function MemoryReactions({ memoryId, reaction }: Readonly<MemoryReactionsProps>) {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const [confirmedReaction, setConfirmedReaction] = useState(reaction);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("");
  const controlRef = useRef<HTMLDivElement>(null);
  const mutation = useMemoryReaction(memoryId, () => router.refresh());
  const [summary, addOptimisticReaction] = useOptimistic(confirmedReaction, applyReaction);

  useEffect(() => setConfirmedReaction(reaction), [reaction]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const selectReaction = (reactionType: MemoryReactionType) => {
    if (mutation.isPending) return;

    startTransition(async () => {
      addOptimisticReaction(reactionType);
      const nextSummary = await mutation.react(reactionType);
      if (nextSummary) {
        setConfirmedReaction(nextSummary);
        setStatus("");
        setIsOpen(false);
        return;
      }
      setStatus(t("detail.reactions.failed"));
    });
  };

  const activeReactions = MEMORY_REACTION_TYPES.filter(
    (reactionType) => confirmedReaction.counts[reactionType] > 0,
  );
  const totalReactionCount = MEMORY_REACTION_TYPES.reduce(
    (total, reactionType) => total + summary.counts[reactionType],
    0,
  );

  return (
    <div className={styles.control} ref={controlRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={
          totalReactionCount > 0
            ? `${t("detail.reactions.open")}. ${t("detail.reactions.count", {
                count: totalReactionCount,
              })}`
            : t("detail.reactions.open")
        }
        className={styles.trigger}
        disabled={mutation.isPending}
        onClick={() => setIsOpen((open) => !open)}
        title={t("detail.reactions.open")}
        type="button"
      >
        <SmilePlus aria-hidden="true" />
      </button>
      {totalReactionCount > 0 ? (
        <fieldset className={styles.summary}>
          <legend className={styles.memberNames}>
            {t("detail.reactions.count", { count: totalReactionCount })}
          </legend>
          {activeReactions.map((reactionType) => (
            <span
              className={styles.summaryReaction}
              data-current={summary.currentReaction === reactionType}
              data-tooltip={summary.members[reactionType].join(", ")}
              key={reactionType}
              title={summary.members[reactionType].join(", ")}
            >
              <span aria-hidden="true">{reactionIcons[reactionType]}</span>
              <span className={styles.memberNames}>{summary.members[reactionType].join(", ")}</span>
            </span>
          ))}
          <strong aria-hidden="true">{totalReactionCount}</strong>
        </fieldset>
      ) : null}
      {isOpen ? (
        <div className={styles.choices} role="menu" aria-label={t("detail.reactions.heading")}>
          {MEMORY_REACTION_TYPES.map((reactionType) => {
            const isSelected = summary.currentReaction === reactionType;

            return (
              <button
                aria-checked={isSelected}
                aria-label={t("detail.reactions.select", {
                  reaction: t(`detail.reactions.types.${reactionType}`),
                })}
                className={styles.choice}
                data-selected={isSelected}
                disabled={mutation.isPending}
                key={reactionType}
                onClick={() => selectReaction(reactionType)}
                role="menuitemradio"
                type="button"
              >
                <span aria-hidden="true">{reactionIcons[reactionType]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <p className={styles.status} aria-live="polite" role="status">
        {status}
      </p>
    </div>
  );
}
