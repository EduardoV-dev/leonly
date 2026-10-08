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
    ApiSuccessResponse({ description: "Setting updated", data: schema, example: undefined })(
      target,
      key,
      descriptor,
    );
    ApiResponse({
      status: 409,
      description: "Stale revision; read the current settings before retrying.",
      schema: apiResponseSchema({
        data: { type: "object", nullable: true, enum: [null] },
        ok: false,
        example: undefined,
      }),
    })(target, key, descriptor);
  };
}
