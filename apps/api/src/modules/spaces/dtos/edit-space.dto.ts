import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, ValidateBy } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";
import { getCalendarDateError, validateTimezone } from "../../../common/utils/calendar-date.util";
import { MAX_SPACE_NAME_LENGTH, MIN_SPACE_NAME_LENGTH } from "../constants/spaces.constants";

export class RenameSpaceDto extends OptimisticLockDto {
  @ApiProperty({
    type: String,
    minLength: MIN_SPACE_NAME_LENGTH,
    maxLength: MAX_SPACE_NAME_LENGTH,
    example: "Our Space",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(MIN_SPACE_NAME_LENGTH, MAX_SPACE_NAME_LENGTH, {
    message: `Enter a name between ${MIN_SPACE_NAME_LENGTH} and ${MAX_SPACE_NAME_LENGTH} characters.`,
  })
  name!: string;
}

export class EditStartDateDto extends OptimisticLockDto {
  @ApiProperty({ type: String, format: "date", example: "2025-04-27" })
  @ValidateBy({
    name: "validStartDate",
    validator: {
      validate: (value: unknown, args) =>
        getCalendarDateError({
          value,
          timezone: (args?.object as EditStartDateDto | undefined)?.timezone,
        }) === null,
      defaultMessage: (args) =>
        getCalendarDateError({
          value: args?.value,
          timezone: (args?.object as EditStartDateDto | undefined)?.timezone,
        }) ?? "Enter a valid start date.",
    },
  })
  startDate!: string;

  @ApiProperty({ type: String, example: "America/Los_Angeles" })
  @ValidateBy({
    name: "validTimezone",
    validator: { validate: validateTimezone, defaultMessage: () => "Enter a valid timezone." },
  })
  timezone!: string;
}
