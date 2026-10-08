import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601, IsString, Matches } from "class-validator";

export class OptimisticLockDto {
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-05T16:00:00.123456Z" })
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/)
  expectedUpdatedAt!: string;
}
