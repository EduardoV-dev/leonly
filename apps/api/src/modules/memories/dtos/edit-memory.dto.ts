import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  isUUID,
  Length,
  ValidateBy,
} from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";
import { getCalendarDateError, validateTimezone } from "../../../common/utils/calendar-date.util";
import { MAX_IMAGE_COUNT } from "../../files/constants/uploads.constants";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../constants/memories.constants";
import { normalizeMemoryText } from "../utils/memory-creation.util";

const toLowercaseIds = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((id: unknown) => (typeof id === "string" ? id.toLowerCase() : id))
    : value;

type EditMemoryDtoFields = Partial<Record<keyof EditMemoryDto, unknown>>;

const readPhotoIds = (fields: EditMemoryDtoFields, key: keyof EditMemoryDto): string[] => {
  const ids = fields[key];
  return Array.isArray(ids) && ids.every((id) => typeof id === "string") ? (ids as string[]) : [];
};

export class EditMemoryDto extends OptimisticLockDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: MAX_TITLE_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @IsString()
  @Length(1, MAX_TITLE_LENGTH)
  title!: string;

  @ApiProperty({ type: String, nullable: true, maxLength: MAX_DESCRIPTION_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @ValidateBy({
    name: "nullableDescription",
    validator: {
      validate: (value: unknown) =>
        value === null || (typeof value === "string" && value.length <= MAX_DESCRIPTION_LENGTH),
      defaultMessage: () =>
        `Description must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    },
  })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true, maxLength: MAX_LOCATION_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? normalizeMemoryText(value) : value,
  )
  @ValidateBy({
    name: "nullableLocation",
    validator: {
      validate: (value: unknown) =>
        value === null || (typeof value === "string" && value.length <= MAX_LOCATION_LENGTH),
      defaultMessage: () =>
        `Location must be a string of at most ${MAX_LOCATION_LENGTH} characters.`,
    },
  })
  location!: string | null;

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
          timezone: (args?.object as EditMemoryDto | undefined)?.timezone,
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
  @Transform(toLowercaseIds)
  @IsArray()
  @ArrayMaxSize(MAX_IMAGE_COUNT)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  retainedPhotoIds!: string[];

  @ApiProperty({
    type: "array",
    items: { type: "string", format: "uuid" },
    maxItems: MAX_IMAGE_COUNT,
    uniqueItems: true,
  })
  @Transform(toLowercaseIds)
  @IsArray()
  @ArrayMaxSize(MAX_IMAGE_COUNT)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  @ValidateBy({
    name: "distinctPhotoReferences",
    validator: {
      validate: (_value: unknown, args) => {
        const object = (args?.object as EditMemoryDtoFields | undefined) ?? {};
        const uploadIds = readPhotoIds(object, "uploadIds");
        const hasOverlap = readPhotoIds(object, "retainedPhotoIds").some((id) =>
          uploadIds.includes(id),
        );

        return !hasOverlap;
      },
      defaultMessage: () => "A photo cannot be both retained and newly added.",
    },
  })
  @ValidateBy({
    name: "finalPhotoCount",
    validator: {
      validate: (_value: unknown, args) => {
        const object = (args?.object as EditMemoryDtoFields | undefined) ?? {};
        const finalPhotoCount =
          readPhotoIds(object, "retainedPhotoIds").length +
          readPhotoIds(object, "uploadIds").length;

        return finalPhotoCount <= MAX_IMAGE_COUNT;
      },
      defaultMessage: () => `Choose up to ${MAX_IMAGE_COUNT} photos in the final memory.`,
    },
  })
  uploadIds!: string[];

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  @ValidateBy({
    name: "nullableCoverFileId",
    validator: {
      validate: (value: unknown) =>
        value === null || (typeof value === "string" && isUUID(value, "all")),
      defaultMessage: () => "Cover must reference a final photo or be null.",
    },
  })
  @ValidateBy({
    name: "finalCoverReference",
    validator: {
      validate: (value: unknown, args) => {
        const object = (args?.object as EditMemoryDtoFields | undefined) ?? {};
        const finalPhotoIds = [
          ...readPhotoIds(object, "retainedPhotoIds"),
          ...readPhotoIds(object, "uploadIds"),
        ];
        if (value === null || value === undefined) return finalPhotoIds.length === 0;

        return typeof value === "string" && finalPhotoIds.includes(value);
      },
      defaultMessage: () => "Choose a final photo as the cover.",
    },
  })
  coverFileId!: string | null;
}
