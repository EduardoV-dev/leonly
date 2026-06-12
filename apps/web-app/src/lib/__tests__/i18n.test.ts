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

describe("notFound namespace", () => {
  it("resolves 404 translations in english and spanish", () => {
    const englishT = i18n.getFixedT("en", "notFound");
    const spanishT = i18n.getFixedT("es", "notFound");

    expect(englishT("heading")).toBe("This page is not in your album.");
    expect(englishT("actions.unauthenticated")).toBe("Sign in to memories");
    expect(spanishT("heading")).toBe("Esta pagina no esta en tu album.");
    expect(spanishT("actions.authenticated")).toBe("Ir a recuerdos");
  });
});

describe("spaceSetup namespace", () => {
  it("resolves setup translations in english and spanish", () => {
    const englishT = i18n.getFixedT("en", "spaceSetup");
    const spanishT = i18n.getFixedT("es", "spaceSetup");

    expect(englishT("steps.start.heading")).toBe("Begin Your Story");
    expect(englishT("steps.join.heading")).toBe("Join your shared space");
    expect(englishT("tabs.create")).toBe("Create a Space");
    expect(englishT("stepMarker.label", { step: 2, total: 3 })).toBe("Step 2 of 3");
    expect(englishT("actions.copyCode")).toBe("Copy Code");
    expect(englishT("actions.copied")).toBe("Copied");
    expect(englishT("story.create-start.caption")).toBe("Every great story has a beginning.");

    expect(spanishT("steps.start.heading")).toBe("Empieza tu historia");
    expect(spanishT("steps.join.heading")).toBe("Unete a su espacio compartido");
    expect(spanishT("tabs.join")).toBe("Unirse con codigo");
    expect(spanishT("stepMarker.label", { step: 3, total: 3 })).toBe("Paso 3 de 3");
    expect(spanishT("actions.copyCode")).toBe("Copiar codigo");
    expect(spanishT("actions.copied")).toBe("Copiado");
    expect(spanishT("story.join-code.imageAlt")).toBe("Pareja tomada de la mano al aire libre");
  });
});
