"use client";

import { ArrowLeft, CalendarDays, LockKeyhole, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryPhotoGallery } from "../../components/memory-photo-gallery";
import type { MemoryDetail } from "../../types/memory-detail";
import styles from "./memory-detail.module.css";

type MemoryDetailPageProps = {
  actions?: ReactNode;
  comments?: ReactNode;
  memory: MemoryDetail;
  reactions?: ReactNode;
};

export function MemoryDetailPage({
  actions,
  comments,
  memory,
  reactions,
}: Readonly<MemoryDetailPageProps>) {
  const { i18n, t } = useTranslation("memories");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${memory.memoryDate}T00:00:00`));
  const creatorInitial = memory.creatorDisplayName.trim().charAt(0).toLocaleUpperCase(locale);
  const isVaultMemory = memory.visibility === "vault";

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href={APP_ROUTES.TIMELINE}>
        <ArrowLeft aria-hidden="true" />
        {t("detail.actions.backToTimeline")}
      </Link>

      <div className={styles.spread}>
        <MemoryPhotoGallery photos={memory.photos} title={memory.title} />

        <article className={styles.story}>
          <header className={styles.header}>
            <div className={styles.metadata}>
              <p>
                <CalendarDays aria-hidden="true" />
                <time dateTime={memory.memoryDate}>{formattedDate}</time>
              </p>
              {memory.location ? (
                <p>
                  <MapPin aria-hidden="true" />
                  {memory.location}
                </p>
              ) : null}
            </div>

            <h1 id="memory-detail-title">{memory.title}</h1>

            <p className={styles.visibility} data-visibility={memory.visibility}>
              {isVaultMemory ? (
                <LockKeyhole aria-hidden="true" />
              ) : (
                <UsersRound aria-hidden="true" />
              )}
              {t(`detail.visibility.${memory.visibility}`)}
            </p>
          </header>

          {memory.description ? <p className={styles.description}>{memory.description}</p> : null}

          <footer className={styles.creator}>
            <span className={styles.avatar} aria-hidden="true">
              {creatorInitial}
            </span>
            <p>{t("detail.creator", { name: memory.creatorDisplayName })}</p>
          </footer>

          {actions ? (
            <section data-extension-region="memory-actions" data-visibility={memory.visibility}>
              {actions}
            </section>
          ) : null}
          {reactions ? (
            <section data-extension-region="memory-reactions">{reactions}</section>
          ) : null}
          {comments ? <section data-extension-region="memory-comments">{comments}</section> : null}
        </article>
      </div>
    </div>
  );
}
