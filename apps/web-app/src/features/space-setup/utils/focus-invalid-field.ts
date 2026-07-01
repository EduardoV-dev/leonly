export function focusInvalidField(fieldId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const field = document.getElementById(fieldId);

    if (!field) {
      return;
    }

    const fieldWrapper = field.closest("[data-setup-field]");

    fieldWrapper?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (field instanceof HTMLElement) {
      field.focus({ preventScroll: true });
    }
  });
}
