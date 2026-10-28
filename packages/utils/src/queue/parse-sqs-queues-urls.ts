export function parseSqsQueuesUrls(value: string): Record<string, string> {
  if (!value) return {};

  let queues: unknown;
  try {
    queues = JSON.parse(value);
  } catch {
    throw new Error("SQS_QUEUES_URLS must be valid JSON");
  }

  if (typeof queues !== "object" || queues === null || Array.isArray(queues)) {
    throw new Error("SQS_QUEUES_URLS must be a JSON object of queue URLs");
  }

  for (const [name, url] of Object.entries(queues)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`SQS_QUEUES_URLS key "${name}" must use kebab-case`);
    }
    if (typeof url !== "string" || !url.trim()) {
      throw new Error(`SQS_QUEUES_URLS["${name}"] must be a non-empty string`);
    }
  }

  return queues as Record<string, string>;
}
