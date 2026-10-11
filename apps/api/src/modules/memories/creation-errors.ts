import { ConflictException, NotFoundException } from "@nestjs/common";

export function throwCreationInProgressError(): never {
  throw new ConflictException({
    errors: [
      {
        code: "CREATION_IN_PROGRESS",
        message: "Creation is in progress. Retry with the same input and key.",
      },
    ],
  });
}

export function throwUnavailableUploadError(): never {
  throw new NotFoundException({ error: "One or more uploads are unavailable." });
}

export function throwConflictingCreationError(): never {
  throw new ConflictException({
    errors: [
      {
        code: "IDEMPOTENCY_CONFLICT",
        message: "This creation key was already used with different input.",
      },
    ],
  });
}
