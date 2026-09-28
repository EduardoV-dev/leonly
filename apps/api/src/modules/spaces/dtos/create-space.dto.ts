import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, ValidateBy, ValidateIf } from "class-validator";

function validateTimezone(value: unknown): value is string {
  const isValidTimezoneInput = typeof value === "string" && value.length <= 100;
  if (!isValidTimezoneInput) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function startDateError(value: unknown, timezone: unknown): string | null {
  const isDateString = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (!isDateString) {
    return "Enter a valid start date.";
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  const isValidCalendarDate =
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;

  if (!isValidCalendarDate) {
    return "Enter a valid start date.";
  }

  const hasValidTimezone = validateTimezone(timezone);

  if (!hasValidTimezone) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const today = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));

  return value > `${today.year}-${today.month}-${today.day}`
    ? "The start date cannot be in the future."
    : null;
}

export class CreateSpaceDto {
  @ApiProperty({ type: String, minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "Space name must be between 2 and 100 characters." })
  @Length(2, 100, { message: "Space name must be between 2 and 100 characters." })
  space_name!: string;

  @ApiPropertyOptional({ type: String, minLength: 2, maxLength: 100, nullable: true })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((_, value: unknown) => value != null && value !== "")
  @IsString({ message: "Enter a valid name." })
  @Length(2, 100, { message: "Your name must be between 2 and 100 characters." })
  display_name?: string | null;

  @ApiProperty({ type: String, format: "date" })
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

  @ApiProperty({ type: String, example: "America/Los_Angeles" })
  @ValidateBy({
    name: "validTimezone",
    validator: { validate: validateTimezone, defaultMessage: () => "Enter a valid timezone." },
  })
  timezone!: string;
}
