import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsObject,
  ValidateNested,
} from "class-validator";
import { MAX_IMAGE_COUNT } from "../constants/uploads.constants";
import { UploadFileDto } from "./upload-file.dto";

export class IssueUploadsDto {
  @ApiProperty({ type: String, enum: ["memory_image"] })
  @Equals("memory_image", { message: "Choose a supported upload purpose." })
  purpose!: "memory_image";

  @ApiProperty({ type: [UploadFileDto], minItems: 1, maxItems: MAX_IMAGE_COUNT })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMAGE_COUNT)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => UploadFileDto)
  files!: UploadFileDto[];
}
