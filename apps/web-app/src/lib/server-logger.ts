export function logServerError(message: string, details: unknown) {
  // biome-ignore lint/suspicious/noConsole: Next.js forwards server console errors to platform logs.
  console.error(message, details);
}
