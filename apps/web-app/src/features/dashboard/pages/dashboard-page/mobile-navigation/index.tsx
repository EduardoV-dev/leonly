import { BookHeart, LayoutGrid, LockKeyhole, MapPin, Settings } from "lucide-react";
import Link from "next/link";
import { APP_ROUTES } from "@/constants/routes";
import type { DashboardSection } from "../dashboard-section";
import styles from "./mobile-navigation.module.css";

type MobileNavigationProps = {
  activeSection: DashboardSection;
};

export function MobileNavigation({ activeSection }: Readonly<MobileNavigationProps>) {
  return (
    <nav className={styles.navigation} aria-label="Mobile dashboard sections">
      <Link
        href={APP_ROUTES.HOME}
        aria-current={activeSection === "dashboard" ? "page" : undefined}
      >
        <LayoutGrid aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
      <Link
        href={APP_ROUTES.TIMELINE}
        aria-current={activeSection === "timeline" ? "page" : undefined}
      >
        <BookHeart aria-hidden="true" />
        <span>Timeline</span>
      </Link>
      <button type="button" disabled>
        <MapPin aria-hidden="true" />
        <span>Places</span>
      </button>
      <Link href={APP_ROUTES.VAULT} aria-current={activeSection === "vault" ? "page" : undefined}>
        <LockKeyhole aria-hidden="true" />
        <span>Vault</span>
      </Link>
      <Link
        href={APP_ROUTES.SETTINGS}
        aria-current={activeSection === "settings" ? "page" : undefined}
      >
        <Settings aria-hidden="true" />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
