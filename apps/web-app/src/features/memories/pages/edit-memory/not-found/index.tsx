"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import styles from "../edit-memory-state.module.css";

export function EditMemoryUnavailable() {
  const { t } = useTranslation("memories");
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p>{t("detail.notFound.eyebrow")}</p>
        <h1>{t("detail.notFound.heading")}</h1>
        <span>{t("detail.notFound.description")}</span>
        <Link href={APP_ROUTES.TIMELINE}>{t("detail.actions.backToTimeline")}</Link>
      </section>
    </main>
  );
}
