import { BadRequestException, ParseUUIDPipe } from "@nestjs/common";

export function createUuidValidationPipe(message: string): ParseUUIDPipe {
  return new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException({ error: message }) });
}
