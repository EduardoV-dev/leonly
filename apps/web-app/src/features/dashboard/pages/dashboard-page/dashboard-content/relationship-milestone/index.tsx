"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getInclusiveCalendarDayCount } from "@/utils/calendar-date";
import styles from "../dashboard-content.module.css";

type RelationshipMilestoneProps = {
  startDate: string | null;
};

export function RelationshipMilestone({ startDate }: Readonly<RelationshipMilestoneProps>) {
  const router = useRouter();
  const { i18n, t } = useTranslation("dashboard");
  const [today, setToday] = useState<Date | null>(null);
  const daysTogether = today ? getInclusiveCalendarDayCount(startDate, today) : undefined;

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;

    const refreshToday = () => setToday(new Date());
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      clearTimeout(midnightTimer);
      midnightTimer = setTimeout(() => {
        refreshToday();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime());
    };
    const refreshAfterFocus = () => {
      refreshToday();
      scheduleMidnightRefresh();
    };
    const refreshAfterVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshAfterFocus();
      }
    };

    refreshToday();
    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshAfterFocus);
    document.addEventListener("visibilitychange", refreshAfterVisibility);

    return () => {
      clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshAfterFocus);
      document.removeEventListener("visibilitychange", refreshAfterVisibility);
    };
  }, []);

  if (daysTogether === undefined) {
    return <h2 aria-label={t("milestone.loading")}> </h2>;
  }

  if (daysTogether === null) {
    return (
      <div className={styles.unavailableDate}>
        <h2>{t("milestone.unavailable")}</h2>
        <p>{t("milestone.unavailableDescription")}</p>
        <button type="button" onClick={() => router.refresh()}>
          {t("error.retry")}
        </button>
      </div>
    );
  }

  return (
    <>
      <h2>
        {t("milestone.days", {
          count: daysTogether,
          formattedCount: daysTogether.toLocaleString(
            i18n.resolvedLanguage === "es" ? "es-ES" : "en-US",
          ),
        })}
      </h2>
      <p>{t("milestone.description")}</p>
    </>
  );
}
