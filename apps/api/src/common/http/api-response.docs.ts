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

type ApiResponseSchemaParams = {
  data: SchemaObject;
  ok: boolean;
  example: unknown;
};

type ApiSuccessResponseParams = {
  status?: number;
  description: string;
  data: SchemaObject;
  example: unknown;
};

export function apiResponseSchema({ data, ok, example }: ApiResponseSchemaParams): SchemaObject {
  return {
    type: "object",
    required: ["ok", "data", "error", "message"],
    properties: {
      ok: { type: "boolean", enum: [ok] },
      data,
      error: { ...ERROR_SCHEMA, ...(ok ? { maxItems: 0 } : { minItems: 1 }) },
      message: { type: "string" },
    },
    example,
  };
}

export function ApiSuccessResponse({
  status = HttpStatus.OK,
  description,
  data,
  example,
}: ApiSuccessResponseParams): MethodDecorator & ClassDecorator {
  return ApiResponse({
    status,
    description,
    schema: apiResponseSchema({
      data,
      ok: true,
      example: { ok: true, data: example, error: [], message: API_SUCCESS_MESSAGE },
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
