import type { Instrumentation } from "next";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  const requestLogger = createRequestLogger(_request);

  logServerError(
    {
      event: "next_request_error",
      operation: context.routeType,
    },
    error,
    requestLogger,
  );
};
