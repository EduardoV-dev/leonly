import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsString, Matches, Max, Min, ValidateBy } from "class-validator";
import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from "../constants/uploads.constants";

export class UploadFileDto {
  @ApiProperty({ type: String, example: "photo.jpg" })
  @IsString()
  @Matches(/^[^\p{Cc}/\\]+$/u, {
    message: "Provide a photo filename without paths or control characters.",
  })
  @ValidateBy({
    name: "matchingImageExtension",
    validator: {
      validate: (value: unknown, args) => {
        if (typeof value !== "string") return false;

        const contentType = (args?.object as UploadFileDto | undefined)?.contentType;
        const hasSupportedType =
          typeof contentType === "string" && Object.hasOwn(IMAGE_EXTENSIONS, contentType);
        if (!hasSupportedType) return true;

        const extension = value.split(".").at(-1)?.toLowerCase();
        const extensions: readonly string[] = IMAGE_EXTENSIONS[contentType];
        const hasValidExtension =
          extension !== undefined &&
          value.toLowerCase() !== extension &&
          extensions.includes(extension);

        return hasValidExtension;
      },
      defaultMessage: () => "The filename extension must match the image type.",
    },
  })
  filename!: string;

  @ApiProperty({ type: String, enum: Object.keys(IMAGE_EXTENSIONS) })
  @IsIn(Object.keys(IMAGE_EXTENSIONS), { message: "Use JPEG, PNG, or WebP." })
  contentType!: keyof typeof IMAGE_EXTENSIONS;

  @ApiProperty({ type: "integer", minimum: 1, maximum: MAX_IMAGE_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  byteSize!: number;
}
