import {
  ConsecutiveBreaker,
  circuitBreaker,
  retry as cockatielRetry,
  ExponentialBackoff,
  handleAll,
  handleWhen,
  TimeoutStrategy,
  timeout,
} from "cockatiel";

type RetryOptions = {
  maxAttempts: number;
  shouldRetry: (error: unknown) => boolean;
  backoff?: { initialDelayMs: number; maxDelayMs: number };
};

export function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, shouldRetry, backoff } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  if (
    backoff &&
    (!Number.isFinite(backoff.initialDelayMs) ||
      !Number.isFinite(backoff.maxDelayMs) ||
      backoff.initialDelayMs < 0 ||
      backoff.maxDelayMs < backoff.initialDelayMs)
  ) {
    throw new RangeError("backoff delays must be finite and maxDelayMs >= initialDelayMs");
  }

  return cockatielRetry(handleWhen(shouldRetry), {
    maxAttempts: maxAttempts - 1,
    ...(backoff
      ? {
          backoff: new ExponentialBackoff({
            initialDelay: backoff.initialDelayMs,
            maxDelay: backoff.maxDelayMs,
          }),
        }
      : {}),
  }).execute(operation);
}

export function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive finite number");
  }

  return timeout(timeoutMs, TimeoutStrategy.Aggressive).execute(({ signal }) => operation(signal));
}

export function createCircuitBreaker(options: {
  failureThreshold: number;
  halfOpenAfterMs: number;
}) {
  if (!Number.isInteger(options.failureThreshold) || options.failureThreshold < 1) {
    throw new RangeError("failureThreshold must be a positive integer");
  }
  if (!Number.isFinite(options.halfOpenAfterMs) || options.halfOpenAfterMs <= 0) {
    throw new RangeError("halfOpenAfterMs must be a positive finite number");
  }

  return circuitBreaker(handleAll, {
    halfOpenAfter: options.halfOpenAfterMs,
    breaker: new ConsecutiveBreaker(options.failureThreshold),
  });
}
