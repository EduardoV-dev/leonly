import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";

export class EditDisplayNameDto extends OptimisticLockDto {
  @ApiProperty({ type: String, minLength: 2, maxLength: 100, example: "Leo" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 100, { message: "Enter a name between 2 and 100 characters." })
  displayName!: string;
}
