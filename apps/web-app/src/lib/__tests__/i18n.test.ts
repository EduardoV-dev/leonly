import {
  detectLanguageFromLocales,
  i18n,
  normalizeLanguage,
  resolveInitialLanguage,
  setLanguage,
} from "@/lib/i18n";

describe("i18n helpers", () => {
  it("normalizes spanish and defaults unknown to english", () => {
    expect(normalizeLanguage("es-NI")).toBe("es");
    expect(normalizeLanguage("es-ES")).toBe("es");
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("fr-CA")).toBe("en");
    expect(normalizeLanguage(undefined)).toBe("en");
  });

  it("detects language from browser locales priority list", () => {
    expect(detectLanguageFromLocales(["es-MX", "en-US"])).toBe("es");
    expect(detectLanguageFromLocales(["en-GB", "es-NI"])).toBe("en");
    expect(detectLanguageFromLocales(["fr-CA", "pt-BR"])).toBe("en");
  });

  it("resolves initial language using saved locale first", () => {
    expect(resolveInitialLanguage("es", ["en-US"])).toBe("es");
    expect(resolveInitialLanguage("en", ["es-NI"])).toBe("en");
    expect(resolveInitialLanguage(null, ["es-NI"])).toBe("es");
    expect(resolveInitialLanguage(undefined, ["fr-FR"])).toBe("en");
  });
});

describe("setLanguage", () => {
  it("updates i18n language, html lang, and localStorage", async () => {
    window.localStorage.removeItem("leonly.locale");
    document.documentElement.lang = "en";

    await setLanguage("es");

    expect(window.localStorage.getItem("leonly.locale")).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(i18n.language).toBe("es");
  });
});
