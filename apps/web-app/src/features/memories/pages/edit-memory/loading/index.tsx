"use client";

import { useTranslation } from "react-i18next";
import { CreateMemoryLoading } from "../../create-memory/loading";

export function EditMemoryLoading() {
  const { t } = useTranslation("memories");

  return <CreateMemoryLoading label={t("edit.loading")} />;
}
