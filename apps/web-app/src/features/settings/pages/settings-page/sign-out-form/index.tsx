"use client";

import { LogOut } from "lucide-react";
import { useActionState } from "react";
import { useTranslation } from "react-i18next";
import { type SignOutState, signOutCurrentSession } from "../../../server/sign-out-current-session";
import styles from "./sign-out-form.module.css";

const INITIAL_STATE: SignOutState = { status: "idle" };

export function SignOutForm() {
  const { t } = useTranslation("settings");
  const [state, action, isPending] = useActionState(signOutCurrentSession, INITIAL_STATE);

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
