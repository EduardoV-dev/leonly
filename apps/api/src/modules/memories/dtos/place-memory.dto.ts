import type { MemoryPlacementRequest } from "@leonly/utils/contracts";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";

export class PlaceMemoryDto extends OptimisticLockDto implements MemoryPlacementRequest {
  @ApiProperty({ enum: ["timeline", "vault"] })
  @IsIn(["timeline", "vault"])
  visibility!: MemoryPlacementRequest["visibility"];
}
