"use client";

import { ArrowLeft, BookX } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import styles from "./memory-detail-not-found.module.css";

export function MemoryDetailNotFound() {
  const { t } = useTranslation("memories");

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <span className={styles.icon} aria-hidden="true">
          <BookX />
        </span>
        <p className={styles.eyebrow}>{t("detail.notFound.eyebrow")}</p>
        <h1>{t("detail.notFound.heading")}</h1>
        <p className={styles.description}>{t("detail.notFound.description")}</p>
        <Link href={APP_ROUTES.TIMELINE}>
          <ArrowLeft aria-hidden="true" />
          {t("detail.actions.backToTimeline")}
        </Link>
      </section>
    </div>
  );
}
