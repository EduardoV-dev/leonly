"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getInclusiveCalendarDayCount } from "@/utils/calendar-date";
import styles from "../dashboard-content.module.css";

type RelationshipMilestoneProps = {
  startDate: string | null;
};

export function RelationshipMilestone({ startDate }: Readonly<RelationshipMilestoneProps>) {
  const router = useRouter();
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
    return <h2 aria-label="Loading day count">&nbsp;</h2>;
  }

  if (daysTogether === null) {
    return (
      <div className={styles.unavailableDate}>
        <h2>Day count unavailable</h2>
        <p>We could not use your space's start date.</p>
        <button type="button" onClick={() => router.refresh()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <h2>
        {daysTogether.toLocaleString()} {daysTogether === 1 ? "day" : "days"} together
      </h2>
      <p>
        Every moment captured, every memory cherished. Your journey continues to unfold beautifully.
      </p>
    </>
  );
}
