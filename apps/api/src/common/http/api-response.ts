export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T | null; error: []; message: string }
  | { ok: false; data: T | null; error: ApiError[]; message: string };

export const API_SUCCESS_MESSAGE = "Request completed successfully";

const API_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  400: "The request is invalid.",
  401: "Authentication is required.",
  403: "You are not allowed to perform this action.",
  404: "The requested resource was not found.",
  409: "The request conflicts with the current state.",
  429: "Too many requests. Please try again later.",
  500: "We could not complete your request. Please try again.",
  503: "Service is temporarily unavailable. Please try again later.",
};

export function createApiError(status: number): ApiError {
  const isInternalError = status >= 500 && status !== 503;
  return {
    code: isInternalError ? "INTERNAL_ERROR" : `HTTP_${status}`,
    message: API_ERROR_MESSAGES[isInternalError ? 500 : status] ?? "Request failed.",
  };
}
