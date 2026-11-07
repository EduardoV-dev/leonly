import { MEMORY_REACTION_TYPES, type MemoryReactionType } from "@leonly/utils/contracts";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class ToggleMemoryReactionDto {
  @ApiProperty({ enum: MEMORY_REACTION_TYPES })
  @IsIn(MEMORY_REACTION_TYPES)
  reactionType!: MemoryReactionType;
}
