"use client";

import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryDetailNotFound } from "@/features/memories/pages/memory-detail/not-found";

export default function VaultMemoryDetailNotFound() {
  const { t } = useTranslation("memories");

  return (
    <MemoryDetailNotFound
      backHref={APP_ROUTES.VAULT}
      backLabel={t("vault.detail.actions.backToVault")}
    />
  );
}
