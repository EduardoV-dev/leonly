import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styles from "./back-link.module.css";

type BackLinkProps = {
  href: string;
};

export function BackLink({ href }: BackLinkProps) {
  const { t } = useTranslation("spaceSetup");

  return (
    <Link href={href} className={styles.backButton}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t("actions.back")}
    </Link>
  );
}
