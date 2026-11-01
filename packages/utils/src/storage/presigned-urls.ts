import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const UPLOAD_URL_SECONDS = 600;

export function createUploadUrl(options: {
  client: S3Client;
  bucket: string;
  key: string;
  contentType: string;
  byteSize: number;
  issuedAt: Date;
}): Promise<string> {
  const { client, bucket, key, contentType, byteSize, issuedAt } = options;
  const hasInvalidByteSize = !Number.isSafeInteger(byteSize) || byteSize < 1;

  if (hasInvalidByteSize) throw new Error("Upload byte size must be a positive safe integer");

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: byteSize,
    }),
    {
      expiresIn: UPLOAD_URL_SECONDS,
      signingDate: issuedAt,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
}
