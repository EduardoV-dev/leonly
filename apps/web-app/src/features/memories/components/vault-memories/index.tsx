"use client";

import { Archive, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { MemoryChronology } from "../memory-chronology";
import { useVaultMemories } from "./use-vault-memories";
import styles from "./vault-memories.module.css";

const SLOW_REQUEST_MS = 750;

export function VaultMemories() {
  const { t } = useTranslation("memories");
  const vaultQuery = useVaultMemories();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!vaultQuery.isPending) {
      setIsSlow(false);
      return;
    }

    const slowTimer = window.setTimeout(() => setIsSlow(true), SLOW_REQUEST_MS);
    return () => window.clearTimeout(slowTimer);
  }, [vaultQuery.isPending]);

  if (vaultQuery.isPending) {
    return (
      <output className={styles.feedback} aria-label={t("vault.loading.label")}>
        <LockKeyhole aria-hidden="true" />
        <span>{t(isSlow ? "vault.loading.slow" : "vault.loading.standard")}</span>
      </output>
    );
  }

  const pages = vaultQuery.data?.pages ?? [];

  if (vaultQuery.isError && pages.length === 0) {
    return (
      <section className={styles.feedback} role="alert">
        <LockKeyhole aria-hidden="true" />
        <h2>{t("vault.error.heading")}</h2>
        <p>{t("vault.error.description")}</p>
        <button type="button" onClick={() => void vaultQuery.refetch()}>
          {t("vault.actions.retry")}
        </button>
      </section>
    );
  }

  let resetPageIndex = -1;
  for (let index = pages.length - 1; index >= 0; index -= 1) {
    if (pages[index].cursorReset) {
      resetPageIndex = index;
      break;
    }
  }
  const visiblePages = resetPageIndex === -1 ? pages : pages.slice(resetPageIndex);
  const memories = visiblePages.flatMap((page) => page.memories);

  if (memories.length === 0) {
    return (
      <section className={styles.feedback}>
        <Archive aria-hidden="true" />
        <h2>{t("vault.empty.heading")}</h2>
        <p>{t("vault.empty.description")}</p>
        <Link href={APP_ROUTES.MEMORIES_NEW}>{t("vault.actions.create")}</Link>
      </section>
    );
  }

  return (
    <MemoryChronology
      destination="vault"
      memories={memories}
      pagination={{
        errorMessage: t("vault.error.loadMore"),
        hasNextPage: Boolean(vaultQuery.hasNextPage),
        isError: vaultQuery.isFetchNextPageError,
        isLoading: vaultQuery.isFetchingNextPage,
        loadLabel: t("vault.actions.loadMore"),
        loadingLabel: t("vault.actions.loadingMore"),
        onLoad: () => void vaultQuery.fetchNextPage(),
        retryLabel: t("vault.actions.retryLoadMore"),
      }}
    />
  );
}
