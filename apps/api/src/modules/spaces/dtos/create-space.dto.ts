import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, ValidateBy, ValidateIf } from "class-validator";
import { getCalendarDateError, validateTimezone } from "../../../common/utils/calendar-date.util";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_SPACE_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_SPACE_NAME_LENGTH,
} from "../constants/spaces.constants";

export class CreateSpaceDto {
  @ApiProperty({
    type: String,
    minLength: MIN_SPACE_NAME_LENGTH,
    maxLength: MAX_SPACE_NAME_LENGTH,
    example: "Forever Us",
    description: "Space name, trimmed before validation.",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Space name must be between 2 and 100 characters." })
  @Length(MIN_SPACE_NAME_LENGTH, MAX_SPACE_NAME_LENGTH, {
    message: `Space name must be between ${MIN_SPACE_NAME_LENGTH} and ${MAX_SPACE_NAME_LENGTH} characters.`,
  })
  space_name!: string;

  @ApiPropertyOptional({
    type: String,
    minLength: MIN_DISPLAY_NAME_LENGTH,
    maxLength: MAX_DISPLAY_NAME_LENGTH,
    nullable: true,
    example: "Leo",
    description: "Member name. Omit, send null, or leave empty to use the account name.",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((_, value: unknown) => value != null && value !== "")
  @IsString({ message: "Enter a valid name." })
  @Length(MIN_DISPLAY_NAME_LENGTH, MAX_DISPLAY_NAME_LENGTH, {
    message: `Your name must be between ${MIN_DISPLAY_NAME_LENGTH} and ${MAX_DISPLAY_NAME_LENGTH} characters.`,
  })
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
        getCalendarDateError({
          value,
          timezone: (args?.object as CreateSpaceDto | undefined)?.timezone,
        }) === null,
      defaultMessage: (args) =>
        getCalendarDateError({
          value: args?.value,
          timezone: (args?.object as CreateSpaceDto | undefined)?.timezone,
        }) ?? "Enter a valid start date.",
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
