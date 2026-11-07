"use client";

import { SmilePlus } from "lucide-react";
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
  reactionType: MemoryReactionType | null,
): MemoryReactionSummary {
  const currentReaction = summary.currentReaction;
  const counts = { ...summary.counts };

  if (currentReaction === reactionType) return summary;

  if (currentReaction) counts[currentReaction] = Math.max(0, counts[currentReaction] - 1);
  if (reactionType) counts[reactionType] += 1;
  return { ...summary, counts, currentReaction: reactionType };
}

export function MemoryReactions({ memoryId, reaction }: Readonly<MemoryReactionsProps>) {
  const { t } = useTranslation("memories");
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const mutation = useMemoryReaction(memoryId, reaction);
  const [summary, addOptimisticReaction] = useOptimistic(mutation.summary, applyReaction);

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

    const request = mutation.react(reactionType);
    startTransition(async () => {
      addOptimisticReaction(summary.currentReaction === reactionType ? null : reactionType);
      const nextSummary = await request;
      if (nextSummary) {
        setIsOpen(false);
        return;
      }
    });
  };

  const activeReactions = MEMORY_REACTION_TYPES.filter(
    (reactionType) => summary.counts[reactionType] > 0,
  );
  const totalReactionCount = MEMORY_REACTION_TYPES.reduce(
    (total, reactionType) => total + summary.counts[reactionType],
    0,
  );

  if (mutation.unavailable) return null;

  return (
    <div className={styles.control} ref={controlRef}>
      <button
        aria-expanded={isOpen}
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
        <fieldset className={styles.choices}>
          <legend className={styles.memberNames}>{t("detail.reactions.heading")}</legend>
          {MEMORY_REACTION_TYPES.map((reactionType) => {
            const isSelected = summary.currentReaction === reactionType;

            return (
              <button
                aria-pressed={isSelected}
                aria-label={t("detail.reactions.select", {
                  reaction: t(`detail.reactions.types.${reactionType}`),
                })}
                className={styles.choice}
                data-selected={isSelected}
                disabled={mutation.isPending}
                key={reactionType}
                onClick={() => selectReaction(reactionType)}
                type="button"
              >
                <span aria-hidden="true">{reactionIcons[reactionType]}</span>
              </button>
            );
          })}
        </fieldset>
      ) : null}
      <p className={styles.status} aria-live="polite" role="status">
        {mutation.failed && t("detail.reactions.failed")}
        {!mutation.failed && mutation.succeeded && t("detail.reactions.success")}
      </p>
    </div>
  );
}
