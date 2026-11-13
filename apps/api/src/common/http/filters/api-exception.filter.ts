import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { PinoLogger } from "nestjs-pino";
import { type ApiError, type ApiResponse, createApiError } from "../utils/api-response";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type GetClientErrorsParams = { response: unknown; status: number };

function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value)) return false;

  const hasCode = typeof value.code === "string";
  const hasMessage = typeof value.message === "string";
  const hasValidField = value.field === undefined || typeof value.field === "string";

  return hasCode && hasMessage && hasValidField;
}

function getClientErrors({ response, status }: GetClientErrorsParams): ApiError[] {
  const responseErrors = isRecord(response) ? response.errors : undefined;

  if (Array.isArray(responseErrors)) {
    const errors = responseErrors.filter(isApiError);
    if (errors.length > 0) return errors;
  }

  const field =
    isRecord(response) && typeof response.field === "string" ? response.field : undefined;
  const message = getClientErrorMessage({ response, status });

  return [{ code: `HTTP_${status}`, message, ...(field ? { field } : {}) }];
}

function getClientErrorMessage({ response, status }: GetClientErrorsParams): string {
  if (typeof response === "string") return response;
  if (!isRecord(response)) return createApiError(status).message;

  const errorMessage = response.error;
  const hasErrorMessage = typeof errorMessage === "string";
  if (hasErrorMessage) return errorMessage;

  return createApiError(status).message;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    let status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isBodyTooLarge =
      isRecord(exception) &&
      exception.type === "entity.too.large" &&
      exception.status === HttpStatus.PAYLOAD_TOO_LARGE;
    if (isBodyTooLarge) status = HttpStatus.PAYLOAD_TOO_LARGE;

    const isServerError = status >= 500;

    if (isServerError) {
      this.logger.error(
        { event: "api_request_failed", status, err: exception },
        "Unhandled API error",
      );
    }

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const isClientError = exception instanceof HttpException && !isServerError;
    let error = [createApiError(status)];

    if (isClientError) {
      error = getClientErrors({ response: exceptionResponse, status });
    }

    const response: ApiResponse<null> = {
      ok: false,
      data: null,
      error,
      message: error[0]?.message ?? "Request failed.",
    };
    const { httpAdapter } = this.adapterHost;
    httpAdapter.reply(host.switchToHttp().getResponse(), response, status);
  }
}
