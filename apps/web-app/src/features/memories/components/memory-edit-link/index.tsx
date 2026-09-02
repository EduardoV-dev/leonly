import { Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import styles from "./memory-edit-link.module.css";

type MemoryEditLinkProps = { memoryId: string };

export function MemoryEditLink({ memoryId }: Readonly<MemoryEditLinkProps>) {
  const { t } = useTranslation("memories");
  return (
    <Link className={styles.link} href={APP_ROUTES.MEMORY_EDIT(memoryId)}>
      <Pencil aria-hidden="true" />
      {t("detail.actions.edit")}
    </Link>
  );
}
