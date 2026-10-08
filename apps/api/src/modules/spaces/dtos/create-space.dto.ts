import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, ValidateBy, ValidateIf } from "class-validator";
import { startDateError, validateTimezone } from "../utils/start-date-validation";

export class CreateSpaceDto {
  @ApiProperty({
    type: String,
    minLength: 2,
    maxLength: 100,
    example: "Forever Us",
    description: "Space name, trimmed before validation.",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Space name must be between 2 and 100 characters." })
  @Length(2, 100, { message: "Space name must be between 2 and 100 characters." })
  space_name!: string;

  @ApiPropertyOptional({
    type: String,
    minLength: 2,
    maxLength: 100,
    nullable: true,
    example: "Leo",
    description: "Member name. Omit, send null, or leave empty to use the account name.",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((_, value: unknown) => value != null && value !== "")
  @IsString({ message: "Enter a valid name." })
  @Length(2, 100, { message: "Your name must be between 2 and 100 characters." })
  display_name?: string | null;

  @ApiProperty({
    type: String,
    format: "date",
    example: "2026-07-22",
    description: "Calendar date, not in the future in the supplied timezone.",
  })
  @ValidateBy({
    name: "validStartDate",
    validator: {
      validate: (value: unknown, args) =>
        startDateError(value, (args?.object as CreateSpaceDto | undefined)?.timezone) === null,
      defaultMessage: (args) =>
        startDateError(args?.value, (args?.object as CreateSpaceDto | undefined)?.timezone) ??
        "Enter a valid start date.",
    },
  })
  start_date!: string;

  @ApiProperty({
    type: String,
    example: "America/Los_Angeles",
    description: "IANA timezone used to validate the start date.",
  })
  @ValidateBy({
    name: "validTimezone",
    validator: { validate: validateTimezone, defaultMessage: () => "Enter a valid timezone." },
  })
  timezone!: string;
}
