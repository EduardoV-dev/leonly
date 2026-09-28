import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import type { ApiError } from "./api-response";

export function validationErrors(errors: ValidationError[]): ApiError[] {
  const result: ApiError[] = [];
  const pending: { error: ValidationError; field: string }[] = errors
    .map((error) => ({ error, field: error.property }))
    .reverse();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;

    const { error, field } = current;
    for (const message of Object.values(error.constraints ?? {})) {
      result.push({ code: "VALIDATION_ERROR", field, message });
    }

    const children = error.children ?? [];
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      pending.push({ error: child, field: `${field}.${child.property}` });
    }
  }

  return result;
}

export const apiValidationPipe = new ValidationPipe({
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  whitelist: true,
  exceptionFactory: (errors: ValidationError[]) =>
    new BadRequestException({ errors: validationErrors(errors) }),
});
