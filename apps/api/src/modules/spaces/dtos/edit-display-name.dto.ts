import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";
import { MAX_DISPLAY_NAME_LENGTH, MIN_DISPLAY_NAME_LENGTH } from "../constants/spaces.constants";

export class EditDisplayNameDto extends OptimisticLockDto {
  @ApiProperty({
    type: String,
    minLength: MIN_DISPLAY_NAME_LENGTH,
    maxLength: MAX_DISPLAY_NAME_LENGTH,
    example: "Leo",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(MIN_DISPLAY_NAME_LENGTH, MAX_DISPLAY_NAME_LENGTH, {
    message: `Enter a name between ${MIN_DISPLAY_NAME_LENGTH} and ${MAX_DISPLAY_NAME_LENGTH} characters.`,
  })
  displayName!: string;
}
