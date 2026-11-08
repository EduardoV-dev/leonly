import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";

export class EditCommentDto extends OptimisticLockDto {
  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(1, 1000)
  body!: string;
}
