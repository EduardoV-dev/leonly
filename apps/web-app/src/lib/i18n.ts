import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { authEn } from "@/locales/en/auth";
import { dashboardEn } from "@/locales/en/dashboard";
import { memoriesEn } from "@/locales/en/memories";
import { notFoundEn } from "@/locales/en/not-found";
import { settingsEn } from "@/locales/en/settings";
import { spaceSetupEn } from "@/locales/en/space-setup";
import { authEs } from "@/locales/es/auth";
import { dashboardEs } from "@/locales/es/dashboard";
import { memoriesEs } from "@/locales/es/memories";
import { notFoundEs } from "@/locales/es/not-found";
import { settingsEs } from "@/locales/es/settings";
import { spaceSetupEs } from "@/locales/es/space-setup";

const LOCALE_STORAGE_KEY = "leonly.locale";
const LANGUAGES = {
  SPANISH: "es",
  ENGLISH: "en",
} as const;

const resources = {
  [LANGUAGES.ENGLISH]: {
    auth: authEn,
    dashboard: dashboardEn,
    memories: memoriesEn,
    notFound: notFoundEn,
    settings: settingsEn,
    spaceSetup: spaceSetupEn,
  },
  [LANGUAGES.SPANISH]: {
    auth: authEs,
    dashboard: dashboardEs,
    memories: memoriesEs,
    notFound: notFoundEs,
    settings: settingsEs,
    spaceSetup: spaceSetupEs,
  },
} as const;

type AppLanguage = keyof typeof resources;

export function normalizeLanguage(locale?: string): AppLanguage {
  const normalized = locale?.toLowerCase().split("-")[0] ?? "";

  if (normalized === LANGUAGES.SPANISH) {
    return LANGUAGES.SPANISH;
  }

  return LANGUAGES.ENGLISH;
}

export function detectLanguageFromLocales(locales: readonly string[]): AppLanguage {
  for (const locale of locales) {
    const language = normalizeLanguage(locale);

    if (Object.values(LANGUAGES).includes(language)) {
      return language;
    }
  }

  return LANGUAGES.ENGLISH;
}

function getBrowserLocales(): string[] {
  if (typeof navigator === "undefined") {
    return [LANGUAGES.ENGLISH];
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }

  return [navigator.language];
}

export function resolveInitialLanguage(
  savedLocale: string | null | undefined,
  browserLocales: readonly string[],
): AppLanguage {
  if (savedLocale !== null && savedLocale !== undefined) {
    return savedLocale === LANGUAGES.SPANISH || savedLocale === LANGUAGES.ENGLISH
      ? savedLocale
      : LANGUAGES.ENGLISH;
  }

  return detectLanguageFromLocales(browserLocales);
}

function getPersistedLanguage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistLanguage(language: AppLanguage): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, language);
    } catch {
      // Restricted browser storage must not prevent an in-memory language change.
    }
  }
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  persistLanguage(language);

  await i18n.changeLanguage(language);

  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

export function initializeLanguage(): Promise<void> {
  const language = resolveInitialLanguage(getPersistedLanguage(), getBrowserLocales());
  return setLanguage(language);
}

const initialLanguage = LANGUAGES.ENGLISH;

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: LANGUAGES.ENGLISH,
  defaultNS: "auth",
  interpolation: {
    escapeValue: false,
  },
});

export type { AppLanguage };
export { i18n };
