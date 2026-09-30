"use client";

import { useTranslation } from "react-i18next";
import styles from "./connectivity-banner.module.css";
import { useConnectivityBanner } from "./use-connectivity-banner";

export function ConnectivityBanner() {
  const { t } = useTranslation("connectivity");
  const status = useConnectivityBanner();

  if (!status) return null;

  return (
    <div
      className={`${styles.banner} ${styles[status]}`}
      role={status === "offline" ? "alert" : "status"}
      aria-atomic="true"
      key={status}
    >
      {t(status)}
    </div>
  );
}
