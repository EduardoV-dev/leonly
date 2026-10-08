"use client";

import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./sign-out-form.module.css";
import { useSignOut } from "./use-sign-out";

export function SignOutForm() {
  const { t } = useTranslation("settings");
  const [state, action, isPending] = useSignOut();

  return (
    <form action={action} className={styles.form}>
      <button type="submit" disabled={isPending} aria-busy={isPending}>
        <LogOut aria-hidden="true" />
        <span>{isPending ? t("account.signingOut") : t("account.signOut")}</span>
      </button>
      <p className={styles.error} role="status" aria-live="polite">
        {state.status === "error" ? t("account.signOutError") : ""}
      </p>
    </form>
  );
}
