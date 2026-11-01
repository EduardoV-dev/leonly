import type { ApiError } from "@leonly/utils/contracts";
import { ServiceUnavailableException } from "@nestjs/common";

// Only explicitly public diagnostics may pass through the server-error boundary.
export class ApiServiceUnavailableError extends ServiceUnavailableException {
  constructor(readonly errors: ApiError[]) {
    super();
  }
}
