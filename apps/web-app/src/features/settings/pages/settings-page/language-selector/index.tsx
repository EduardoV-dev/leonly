"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type AppLanguage, setLanguage } from "@/lib/i18n";
import styles from "./language-selector.module.css";

const languageOptions: ReadonlyArray<{ code: AppLanguage; labelKey: "english" | "spanish" }> = [
  { code: "en", labelKey: "english" },
  { code: "es", labelKey: "spanish" },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation("settings");
  const [isChanging, setIsChanging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const selectedLanguage: AppLanguage = i18n.resolvedLanguage === "es" ? "es" : "en";

  const handleChange = async (language: AppLanguage) => {
    if (isChanging || language === selectedLanguage) return;

    setIsChanging(true);
    await setLanguage(language);
    const translated = i18n.getFixedT(language, "settings");
    setAnnouncement(
      translated("languageSelector.changed", {
        language: translated(
          language === "en" ? "languageSelector.english" : "languageSelector.spanish",
        ),
      }),
    );
    setIsChanging(false);
  };

  return (
    <fieldset className={styles.selector} disabled={isChanging}>
      <legend>{t("languageSelector.legend")}</legend>
      <div className={styles.options}>
        {languageOptions.map((option) => (
          <label key={option.code} className={styles.option}>
            <input
              checked={selectedLanguage === option.code}
              name="interface-language"
              onChange={() => void handleChange(option.code)}
              type="radio"
              value={option.code}
            />
            <span>{t(`languageSelector.${option.labelKey}`)}</span>
          </label>
        ))}
      </div>
      <p className={styles.help}>{t("languageSelector.help")}</p>
      <p aria-live="polite" className={styles.status} role="status">
        {isChanging ? t("languageSelector.pending") : announcement}
      </p>
    </fieldset>
  );
}
