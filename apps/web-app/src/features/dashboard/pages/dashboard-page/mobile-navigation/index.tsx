import { BookHeart, LayoutGrid, LockKeyhole, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import type { DashboardSection } from "../dashboard-section";
import styles from "./mobile-navigation.module.css";

type MobileNavigationProps = {
  activeSection: DashboardSection;
};

export function MobileNavigation({ activeSection }: Readonly<MobileNavigationProps>) {
  const { t } = useTranslation("dashboard");

  return (
    <nav className={styles.navigation} aria-label={t("navigation.mobile")}>
      <Link
        href={APP_ROUTES.HOME}
        aria-current={activeSection === "dashboard" ? "page" : undefined}
      >
        <LayoutGrid aria-hidden="true" />
        <span>{t("navigation.dashboard")}</span>
      </Link>
      <Link
        href={APP_ROUTES.TIMELINE}
        aria-current={activeSection === "timeline" ? "page" : undefined}
      >
        <BookHeart aria-hidden="true" />
        <span>{t("navigation.timeline")}</span>
      </Link>
      <Link href={APP_ROUTES.VAULT} aria-current={activeSection === "vault" ? "page" : undefined}>
        <LockKeyhole aria-hidden="true" />
        <span>{t("navigation.vault")}</span>
      </Link>
      <Link
        href={APP_ROUTES.SETTINGS}
        prefetch={true}
        aria-current={activeSection === "settings" ? "page" : undefined}
      >
        <Settings aria-hidden="true" />
        <span>{t("navigation.settings")}</span>
      </Link>
    </nav>
  );
}
