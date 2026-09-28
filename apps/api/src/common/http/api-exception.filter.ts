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
import type { ApiError, ApiResponse } from "./api-response";

const INTERNAL_MESSAGE = "We could not complete your request. Please try again.";

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
  const message =
    isRecord(response) && typeof response.error === "string"
      ? response.error
      : typeof response === "string"
        ? response
        : "Request failed.";
  return [{ code: `HTTP_${status}`, message, ...(field ? { field } : {}) }];
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
    if (isServerError) {
      const errorType = exception instanceof Error ? exception.constructor.name : "UnknownError";
      this.logger.error({ errorType }, "Unhandled API error");
    }

    const error =
      exception instanceof HttpException && !isServerError
        ? clientErrors(exception.getResponse(), status)
        : [{ code: "INTERNAL_ERROR", message: INTERNAL_MESSAGE }];
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
