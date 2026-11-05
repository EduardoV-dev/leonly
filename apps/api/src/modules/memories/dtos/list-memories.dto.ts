import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class ListMemoriesDto {
  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;

  @ApiPropertyOptional({ enum: ["newest", "oldest"], default: "newest" })
  @IsOptional()
  @IsIn(["newest", "oldest"])
  sort?: "newest" | "oldest";
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 20, default: 10 })
  @IsOptional()
  @IsString()
  @Matches(/^(?:[1-9]|1[0-9]|20)$/)
  limit?: string;
}
