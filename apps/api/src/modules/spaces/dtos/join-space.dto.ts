import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class ValidateSpaceInviteDto {
  @ApiProperty({
    type: String,
    example: "leoabcde",
    description:
      "Space invite code; an optional hyphen after the prefix and letter casing are normalized.",
  })
  @IsString()
  invite_code!: string;
}

export class JoinSpaceDto extends ValidateSpaceInviteDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: "Leo",
    description:
      "Member name, 2 to 100 characters after trimming. Omit, send null, or leave empty to use the account name.",
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  display_name?: string | null;
}
