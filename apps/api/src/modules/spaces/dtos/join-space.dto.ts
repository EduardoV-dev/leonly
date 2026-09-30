import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class JoinSpaceDto {
  @ApiProperty({ type: String })
  @IsString()
  invite_code!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  display_name?: string | null;
}

export class ValidateSpaceInviteDto {
  @ApiProperty({ type: String })
  @IsString()
  invite_code!: string;
}
