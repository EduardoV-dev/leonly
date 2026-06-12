import clsx from "clsx";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styles from "./setup-tabs.module.css";

type WelcomeTab = "create" | "join";

type SetupTabsProps = {
  activeTab: WelcomeTab;
};

export function SetupTabs({ activeTab }: SetupTabsProps) {
  const { t } = useTranslation("spaceSetup");

  const getLinkClasses = (tab: WelcomeTab) =>
    clsx(styles.tab, {
      [styles.activeTab]: activeTab === tab,
    });

  return (
    <div className={styles.tabs} aria-label={t("tabs.label")}>
      <Link href="/welcome" className={getLinkClasses("create")}>
        {t("tabs.create")}
      </Link>

      <Link href="/welcome/join" className={getLinkClasses("join")}>
        {t("tabs.join")}
      </Link>
    </div>
  );
}
