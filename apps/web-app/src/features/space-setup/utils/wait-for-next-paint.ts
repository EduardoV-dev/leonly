export function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
      return;
    }

    setTimeout(resolve, 0);
  });
}
