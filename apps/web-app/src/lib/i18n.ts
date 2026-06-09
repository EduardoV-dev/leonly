import { authEn } from "@/locales/en/auth";
import { notFoundEn } from "@/locales/en/not-found";
import { authEs } from "@/locales/es/auth";
import { notFoundEs } from "@/locales/es/not-found";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LOCALE_STORAGE_KEY = "leonly.locale";
const LANGUAGES = {
  SPANISH: "es",
  ENGLISH: "en",
} as const;

const resources = {
  [LANGUAGES.ENGLISH]: {
    auth: authEn,
    notFound: notFoundEn,
  },
  [LANGUAGES.SPANISH]: {
    auth: authEs,
    notFound: notFoundEs,
  },
} as const;

type AppLanguage = keyof typeof resources;

export function normalizeLanguage(locale?: string): AppLanguage {
  const normalized = locale?.toLowerCase() ?? "";

  if (normalized.startsWith(LANGUAGES.SPANISH)) {
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
  if (savedLocale) {
    return normalizeLanguage(savedLocale);
  }

  return detectLanguageFromLocales(browserLocales);
}

function getPersistedLanguage(): AppLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  if (!saved) {
    return null;
  }

  return normalizeLanguage(saved);
}

export function setLanguage(language: AppLanguage) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, language);
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }

  return i18n.changeLanguage(language);
}

const initialLanguage = resolveInitialLanguage(getPersistedLanguage(), getBrowserLocales());

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
