import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ListCommentsDto {
  @ApiPropertyOptional({ description: "Opaque cursor returned by the previous page." })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;
}
