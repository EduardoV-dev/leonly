import { HttpStatus } from "@nestjs/common";
import { ApiResponse, type SchemaObject } from "@nestjs/swagger";
import { ApiSuccessResponse, apiResponseSchema } from "./api-response.docs";

const REVISION: SchemaObject = { type: "string", format: "date-time" };

export function EditResponse(field: "name" | "startDate" | "displayName"): MethodDecorator {
  const schema: SchemaObject = {
    type: "object",
    required: [field, "updatedAt", "status"],
    properties: {
      [field]: { type: "string", ...(field === "startDate" ? { format: "date" } : {}) },
      updatedAt: REVISION,
      status: { type: "string", enum: ["updated"] },
    },
  };

  return (target, key, descriptor) => {
    ApiSuccessResponse({
      description: "Setting updated",
      data: schema,
      example: {
        [field]: { name: "Our shared space", startDate: "2026-07-22", displayName: "Alex" }[field],
        updatedAt: "2026-07-22T12:00:00.000000Z",
        status: "updated",
      },
    })(target, key, descriptor);
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: "Stale revision; read the current settings before retrying.",
      schema: apiResponseSchema({
        data: { type: "object", nullable: true, enum: [null] },
        ok: false,
        example: {
          ok: false,
          data: null,
          error: [{ code: "HTTP_409", message: "Conflict" }],
          message: "Conflict",
        },
      }),
    })(target, key, descriptor);
  };
}
