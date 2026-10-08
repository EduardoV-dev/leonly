import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { JoinResult } from "../memberships.types";

export function throwJoinError(result: Exclude<JoinResult, { status: "joined" }>): never {
  if (result.status === "malformed") {
    throw new BadRequestException({ error: "The format of the code provided is invalid." });
  }
  if (result.status === "invalid_name") {
    throw new BadRequestException({
      errors: [
        {
          code: "VALIDATION_ERROR",
          field: "display_name",
          message: "Your name must contain 2 to 100 characters.",
        },
      ],
    });
  }
  throw new NotFoundException({ error: "This invite is invalid or unavailable." });
}
