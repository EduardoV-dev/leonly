import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length, ValidateBy } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";
import { startDateError, validateTimezone } from "../utils/start-date-validation";

export class RenameSpaceDto extends OptimisticLockDto {
  @ApiProperty({ type: String, minLength: 2, maxLength: 100, example: "Our Space" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 100, { message: "Enter a name between 2 and 100 characters." })
  name!: string;
}

export class EditStartDateDto extends OptimisticLockDto {
  @ApiProperty({ type: String, format: "date", example: "2025-04-27" })
  @ValidateBy({
    name: "validStartDate",
    validator: {
      validate: (value: unknown, args) =>
        startDateError(value, (args?.object as EditStartDateDto | undefined)?.timezone) === null,
      defaultMessage: (args) =>
        startDateError(args?.value, (args?.object as EditStartDateDto | undefined)?.timezone) ??
        "Enter a valid start date.",
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
