import { CharacterCount } from "@/components/character-count";
import { APP_ROUTES } from "@/constants/routes";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { DISPLAY_NAME_MAX_LENGTH } from "../../../constants/validation";

export function JoinNameStep() {
  const { t } = useTranslation("spaceSetup");

  return (
    <div>
      <h1 className={styles.heading}>{t("steps.joinName.heading")}</h1>
      <p className={styles.copy}>{t("steps.joinName.description")}</p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="join-display-name">
          {t("steps.joinName.displayNameLabel")}
          <span className={styles.optional}>{t("steps.joinName.optional")}</span>
        </label>
        <input
          id="join-display-name"
          type="text"
          placeholder={t("steps.joinName.displayNamePlaceholder")}
          className={styles.input}
          defaultValue=""
        />
        <div className={styles.fieldMeta}>
          <span />
          <CharacterCount value="" max={DISPLAY_NAME_MAX_LENGTH} />
        </div>
      </div>

      <Link href={APP_ROUTES.HOME} className={styles.linkButton}>
        {t("actions.startStory")}
      </Link>
      <BackLink href={APP_ROUTES.WELCOME_JOIN} />
    </div>
  );
}
