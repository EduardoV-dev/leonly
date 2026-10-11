const SENSITIVE_FIELD_PATTERN =
  /(?:authorization|cookie|password|secret|token|credential|api[_-]?key|session|invite[_-]?code)/i;
const SENSITIVE_TEXT_PATTERN =
  /(\b(?:authorization|cookie|password|secret|token|credential|api[_-]?key|session|invite[_-]?code)\b\s*[:=]\s*)(?:(?:Bearer|Basic)\s+)?[^\s,;]+/gi;
const BEARER_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const URL_QUERY_PATTERN = /(https?:\/\/[^\s?#]+\?)([^\s#]+)/gi;
const URL_CREDENTIAL_PATTERN = /(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+(?::[^\s/@]*)?@/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;

export function serializeError(error: unknown): unknown {
  return sanitizeValue(error, new WeakSet());
}

function sanitizeText(value: string): string {
  return value
    .replace(SENSITIVE_TEXT_PATTERN, "$1[Redacted]")
    .replace(BEARER_PATTERN, "$1 [Redacted]")
    .replace(URL_CREDENTIAL_PATTERN, "$1[Redacted]@")
    .replace(URL_QUERY_PATTERN, "$1[Redacted]")
    .replace(JWT_PATTERN, "[Redacted]")
    .replace(EMAIL_PATTERN, "[Redacted email]");
}

function sanitizeValue(value: unknown, seen: WeakSet<object>, key?: string): unknown {
  if (key && SENSITIVE_FIELD_PATTERN.test(key)) return "[Redacted]";
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) return sanitizeError(value, seen);

  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, seen));
  if (value instanceof Date) return value.toISOString();

  return Object.fromEntries(
    Object.entries(value).map(([property, item]) => [
      property,
      sanitizeValue(item, seen, property),
    ]),
  );
}

function sanitizeError(value: Error, seen: WeakSet<object>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    type: value.constructor.name,
    message: sanitizeText(value.message),
  };
  if (value.stack) serialized.stack = sanitizeText(value.stack);
  for (const property of Object.getOwnPropertyNames(value)) {
    const isStandardProperty = property === "message" || property === "stack";
    if (isStandardProperty) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (!descriptor) continue;
    const isValueProperty = "value" in descriptor;
    if (!isValueProperty) continue;
    serialized[property] = sanitizeValue(descriptor.value, seen, property);
  }
  return serialized;
}
