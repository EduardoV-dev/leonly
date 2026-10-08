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
import { type ApiError, type ApiResponse, createApiError } from "./api-response";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clientErrors(response: unknown, status: number): ApiError[] {
  if (isRecord(response) && Array.isArray(response.errors)) {
    const errors = response.errors.filter(
      (error): error is ApiError =>
        isRecord(error) &&
        typeof error.code === "string" &&
        typeof error.message === "string" &&
        (error.field === undefined || typeof error.field === "string"),
    );
    if (errors.length > 0) return errors;
  }

  const field =
    isRecord(response) && typeof response.field === "string" ? response.field : undefined;
  const message = clientErrorMessage(response, status);
  return [{ code: `HTTP_${status}`, message, ...(field ? { field } : {}) }];
}

function clientErrorMessage(response: unknown, status: number): string {
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
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = status >= 500;
    if (isServerError) this.logger.error({ err: exception }, "Unhandled API error");

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const error =
      exception instanceof HttpException && !isServerError
        ? clientErrors(exceptionResponse, status)
        : [createApiError(status)];
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
