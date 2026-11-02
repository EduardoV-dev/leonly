import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateBy,
} from "class-validator";
import { getCalendarDateError, validateTimezone } from "../../../common/utils/calendar-date.util";
import { MAX_IMAGE_COUNT } from "../../files/constants/uploads.constants";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../constants/memories.constants";
import { normalizeMemoryText } from "../utils/memory-creation.util";

export class CreateMemoryDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: MAX_TITLE_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @IsString()
  @Length(1, MAX_TITLE_LENGTH)
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: MAX_DESCRIPTION_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: MAX_LOCATION_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LOCATION_LENGTH)
  location?: string | null;

  @ApiProperty({
    type: String,
    format: "date",
    description: "Real calendar date, no later than today in timezone",
  })
  @ValidateBy({
    name: "validMemoryDate",
    validator: {
      validate: (value: unknown, args) =>
        getCalendarDateError({
          value,
          timezone: (args?.object as CreateMemoryDto | undefined)?.timezone,
        }) === null,
      defaultMessage: () => "Choose a valid memory date no later than today.",
    },
  })
  memoryDate!: string;

  @ApiProperty({ type: String, example: "UTC" })
  @ValidateBy({
    name: "validTimezone",
    validator: { validate: validateTimezone, defaultMessage: () => "Choose a valid timezone." },
  })
  timezone!: string;

  @ApiProperty({ type: String, enum: ["timeline", "vault"] })
  @IsIn(["timeline", "vault"])
  visibility!: "timeline" | "vault";

  @ApiProperty({
    type: "array",
    items: { type: "string", format: "uuid" },
    maxItems: MAX_IMAGE_COUNT,
    uniqueItems: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((id: unknown) => (typeof id === "string" ? id.toLowerCase() : id))
      : value,
  )
  @IsArray()
  @ArrayMaxSize(MAX_IMAGE_COUNT)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  uploadIds!: string[];

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsUUID("all")
  @ValidateBy({
    name: "attachedCover",
    validator: {
      validate: (value: unknown, args) => {
        const uploadIds = (args?.object as CreateMemoryDto | undefined)?.uploadIds;
        const hasAttachedCover =
          typeof value === "string" && Array.isArray(uploadIds) && uploadIds.includes(value);

        return hasAttachedCover;
      },
      defaultMessage: () => "Choose an attached cover photo.",
    },
  })
  coverUploadId?: string | null;

  @ApiProperty({ type: String, format: "uuid" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @IsUUID("all")
  idempotencyKey!: string;
}
