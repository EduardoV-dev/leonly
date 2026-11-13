const SENSITIVE_FIELD_PATTERN =
  /(?:authorization|cookie|password|secret|token|credential|api[_-]?key|session|invite[_-]?code)/i;
const SENSITIVE_TEXT_PATTERN =
  /(\b(?:authorization|cookie|password|secret|token|credential|api[_-]?key|session|invite[_-]?code)\b\s*[:=]\s*)(?:(?:Bearer|Basic)\s+)?[^\s,;]+/gi;
const BEARER_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const URL_QUERY_PATTERN = /(https?:\/\/[^\s?#]+\?)([^\s#]+)/gi;
const URL_FRAGMENT_PATTERN = /(https?:\/\/[^\s?#]+?(?:\?[^\s#]*)?)#[^\s]*/gi;
const URL_CREDENTIAL_PATTERN = /(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+(?::[^\s/@]*)?@/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
const APPROVED_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const MAX_STRING_BYTES = 2_048;
const MAX_STACK_BYTES = 8_192;
const MAX_CAUSE_DEPTH = 4;
const MAX_OBJECT_DEPTH = 6;
const MAX_ARRAY_ENTRIES = 20;
const MAX_OBJECT_PROPERTIES = 30;
const MAX_ERROR_DATA_BYTES = 12_288;

const TRUNCATION_MARKER = "[Truncated]";
const CIRCULAR_MARKER = "[Circular]";
const REDACTION_MARKER = "[Redacted]";

export function serializeError(error: unknown): unknown {
  return boundErrorData(sanitizeValue(error, new WeakSet()) as Record<string, unknown>);
}

function sanitizeText(value: string, skipEmailRedaction = false): string {
  const sanitized = value
    .replace(SENSITIVE_TEXT_PATTERN, "$1[Redacted]")
    .replace(BEARER_PATTERN, "$1 [Redacted]")
    .replace(URL_CREDENTIAL_PATTERN, "$1[Redacted]@")
    .replace(URL_QUERY_PATTERN, "$1[Redacted]")
    .replace(URL_FRAGMENT_PATTERN, "$1")
    .replace(JWT_PATTERN, "[Redacted]");

  return skipEmailRedaction ? sanitized : sanitized.replace(EMAIL_PATTERN, "[Redacted email]");
}

function sanitizeValue(value: unknown, seen: WeakSet<object>, key?: string, depth = 0): unknown {
  if (key && SENSITIVE_FIELD_PATTERN.test(key)) return REDACTION_MARKER;
  if (typeof value === "string") return truncateUtf8(sanitizeText(value), MAX_STRING_BYTES);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return CIRCULAR_MARKER;
  seen.add(value);

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (depth >= MAX_OBJECT_DEPTH) return TRUNCATION_MARKER;

  if (value instanceof Error) return sanitizeError(value, seen, depth);

  if (Array.isArray(value)) {
    const entries = value
      .slice(0, MAX_ARRAY_ENTRIES)
      .map((item) => sanitizeValue(item, seen, undefined, depth + 1));
    return value.length > MAX_ARRAY_ENTRIES ? [...entries, TRUNCATION_MARKER] : entries;
  }

  return sanitizeProperties(value, seen, depth);
}

function sanitizeProperties(
  value: object,
  seen: WeakSet<object>,
  depth: number,
): Record<string, unknown> {
  const propertyNames = Object.getOwnPropertyNames(value).filter((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    return descriptor?.enumerable === true && "value" in descriptor;
  });
  const sanitized = Object.fromEntries(
    propertyNames.slice(0, MAX_OBJECT_PROPERTIES).flatMap((property) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, property);
      if (!descriptor || !("value" in descriptor)) return [];
      const sanitizedItem = sanitizeValue(descriptor.value, seen, property, depth + 1);
      return sanitizedItem === undefined ? [] : [[property, sanitizedItem]];
    }),
  );

  return propertyNames.length > MAX_OBJECT_PROPERTIES
    ? { ...sanitized, truncatedProperties: TRUNCATION_MARKER }
    : sanitized;
}

function sanitizeError(
  value: Error,
  seen: WeakSet<object>,
  depth: number,
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    type: value.constructor?.name ?? "Error",
    message: truncateUtf8(sanitizeText(value.message), MAX_STRING_BYTES),
  };

  if (value.stack) serialized.stack = sanitizeStack(value.stack);

  for (const property of Object.getOwnPropertyNames(value)) {
    const isStandardProperty = property === "message" || property === "stack";
    if (isStandardProperty) continue;

    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (!descriptor || !("value" in descriptor)) continue;

    if (property === "cause") {
      if (depth >= MAX_CAUSE_DEPTH) {
        serialized.cause = TRUNCATION_MARKER;
        continue;
      }
      const sanitizedCause = sanitizeValue(descriptor.value, seen, property, depth + 1);
      if (sanitizedCause !== undefined) serialized.cause = sanitizedCause;
      continue;
    }

    const sanitizedProperty = sanitizeErrorProperty(property, descriptor.value);
    if (sanitizedProperty !== undefined) serialized[property] = sanitizedProperty;
  }

  return serialized;
}

function sanitizeErrorProperty(property: string, value: unknown): unknown {
  if (SENSITIVE_FIELD_PATTERN.test(property)) return undefined;
  if (property === "code" && typeof value === "string" && APPROVED_CODE_PATTERN.test(value)) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();

  // Third-party message/argument values can carry personal content no regex can
  // reliably recognize, so only approved error properties are retained.
  return undefined;
}

function sanitizeStack(stack: string): string {
  const frames = stack.split("\n").slice(1);
  // Stack frames carry file paths, not personal content, so email redaction is
  // skipped to keep dependency paths like /pnpm/@scope@1.0.0/ readable.
  return truncateUtf8(sanitizeText(frames.join("\n"), true).trim(), MAX_STACK_BYTES);
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  const markerBytes = Buffer.byteLength(TRUNCATION_MARKER, "utf8");
  const contentLimit = Math.max(0, maxBytes - markerBytes);
  let candidate = value.slice(0, contentLimit);
  while (candidate.length > 0 && Buffer.byteLength(candidate, "utf8") > contentLimit) {
    candidate = candidate.slice(0, -1);
  }
  return `${candidate}${TRUNCATION_MARKER}`;
}

function boundErrorData(serialized: unknown): unknown {
  if (!isRecord(serialized)) return serialized;
  if (isWithinErrorDataBytes(serialized)) return serialized;

  const bounded = dropNestedErrorStacks(serialized);

  if (isWithinErrorDataBytes(bounded)) {
    return { ...bounded, truncated: true };
  }

  for (const key of Object.keys(bounded)) {
    if (key === "type" || key === "message" || key === "code" || key === "cause") continue;
    delete bounded[key];
    if (isWithinErrorDataBytes(bounded)) break;
  }

  if (!isWithinErrorDataBytes(bounded)) {
    delete bounded.cause;
  }

  return { ...bounded, truncated: true };
}

function dropNestedErrorStacks(error: Record<string, unknown>): Record<string, unknown> {
  let current: unknown = error;
  while (isRecord(current)) {
    delete current.stack;
    current = current.cause;
  }
  return error;
}

function isWithinErrorDataBytes(serialized: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(serialized), "utf8") <= MAX_ERROR_DATA_BYTES;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
