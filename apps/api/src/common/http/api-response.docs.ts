import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiResponse, type SchemaObject } from "@nestjs/swagger";
import { API_SUCCESS_MESSAGE, createApiError } from "./api-response";

const ERROR_SCHEMA: SchemaObject = {
  type: "array",
  items: {
    type: "object",
    required: ["code", "message"],
    properties: {
      code: { type: "string", description: "HTTP status code or application error code." },
      message: { type: "string" },
      field: { type: "string", description: "Request field associated with a validation error." },
    },
  },
};

export function apiResponseSchema(options: {
  data: SchemaObject;
  ok: boolean;
  example: unknown;
}): SchemaObject {
  return {
    type: "object",
    required: ["ok", "data", "error", "message"],
    properties: {
      ok: { type: "boolean", enum: [options.ok] },
      data: options.data,
      error: { ...ERROR_SCHEMA, ...(options.ok ? { maxItems: 0 } : { minItems: 1 }) },
      message: { type: "string" },
    },
    example: options.example,
  };
}

export function ApiSuccessResponse(options: {
  status?: number;
  description: string;
  data: SchemaObject;
  example: unknown;
}): MethodDecorator & ClassDecorator {
  return ApiResponse({
    status: options.status ?? HttpStatus.OK,
    description: options.description,
    schema: apiResponseSchema({
      data: options.data,
      ok: true,
      example: { ok: true, data: options.example, error: [], message: API_SUCCESS_MESSAGE },
    }),
  });
}

export function ApiErrorResponses(...statuses: number[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...statuses.map((status) => {
      const error = createApiError(status);
      return ApiResponse({
        status,
        description: error.message,
        schema: apiResponseSchema({
          data: { type: "object", nullable: true, enum: [null] },
          ok: false,
          example: { ok: false, data: null, error: [error], message: error.message },
        }),
        ...(status === HttpStatus.TOO_MANY_REQUESTS
          ? {
              headers: {
                "Retry-After": {
                  description: "Seconds to wait before retrying.",
                  schema: { type: "integer", minimum: 1 },
                },
              },
            }
          : {}),
      });
    }),
  );
}
