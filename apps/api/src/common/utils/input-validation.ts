import { BadRequestException } from "@nestjs/common";

type ThrowInputValidationErrorParams = { field: string; message: string };
type RequireObjectParams = { value: unknown; allowedFields: readonly string[] };

export function throwInputValidationError({
  field,
  message,
}: ThrowInputValidationErrorParams): never {
  throw new BadRequestException({ errors: [{ code: "VALIDATION_ERROR", field, message }] });
}

export function requireObject({
  value,
  allowedFields,
}: RequireObjectParams): Record<string, unknown> {
  const isObject = typeof value === "object" && value !== null && !Array.isArray(value);

  if (!isObject) throwInputValidationError({ field: "body", message: "Provide a JSON object." });

  const record = value as Record<string, unknown>;
  const forbiddenField = Object.keys(record).find((field) => !allowedFields.includes(field));

  if (forbiddenField) {
    throwInputValidationError({ field: forbiddenField, message: "This field is not accepted." });
  }

  return record;
}
