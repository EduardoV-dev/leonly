import { Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import styles from "./memory-edit-link.module.css";

type MemoryEditLinkProps = { disabled?: boolean; memoryId: string };

export function MemoryEditLink({ disabled = false, memoryId }: Readonly<MemoryEditLinkProps>) {
  const { t } = useTranslation("memories");
  return (
    <Link
      aria-disabled={disabled}
      aria-label={t("detail.actions.edit")}
      className={styles.link}
      href={APP_ROUTES.MEMORY_EDIT(memoryId)}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      tabIndex={disabled ? -1 : undefined}
      title={t("detail.actions.edit")}
    >
      <Pencil aria-hidden="true" />
    </Link>
  );
}
