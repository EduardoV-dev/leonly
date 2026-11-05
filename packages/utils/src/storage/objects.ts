import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { createStorageClient, type StorageConfiguration } from "./client";
import { createUploadUrl } from "./presigned-urls";

const STORAGE_REQUEST_TIMEOUT_MS = 10_000;

export class ObjectSizeError extends Error { }

type SignUploadParams = {
  key: string;
  contentType: string;
  byteSize: number;
  issuedAt: Date;
};

type GetObjectParams = { key: string; maxBytes: number };
type ObjectMetadata = { byteSize?: number; contentType?: string };

type PutObjectIfAbsentParams = { key: string; bytes: Buffer; contentType: string };

type ReadBoundedObjectParams = {
  body: AsyncIterable<Uint8Array> & { destroy?: () => void };
  contentLength?: number;
  maxBytes: number;
  signal?: AbortSignal;
};

export async function readBoundedObject({
  body,
  contentLength,
  maxBytes,
  signal,
}: ReadBoundedObjectParams): Promise<Buffer> {
  let abort = () => { };

  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(new Error("Storage download timed out"));
    signal?.addEventListener("abort", abort, { once: true });
  });

  try {
    if (signal?.aborted) throw new Error("Storage download timed out");
    if (contentLength !== undefined && contentLength > maxBytes) {
      throw new ObjectSizeError("Object exceeds the allowed byte size");
    }

    const chunks: Buffer[] = [];
    let byteSize = 0;
    const iterator = body[Symbol.asyncIterator]();

    while (true) {
      const next = await Promise.race([iterator.next(), aborted]);
      if (next.done) break;

      const chunk = next.value;
      byteSize += chunk.byteLength;

      if (byteSize > maxBytes) throw new ObjectSizeError("Object exceeds the allowed byte size");
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks, byteSize);
  } finally {
    signal?.removeEventListener("abort", abort);
    body.destroy?.();
  }
}

function getStorageStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;

  const metadata = error.$metadata;

  if (typeof metadata !== "object" || metadata === null || !("httpStatusCode" in metadata)) {
    return undefined;
  }

  return typeof metadata.httpStatusCode === "number" ? metadata.httpStatusCode : undefined;
}

function getStorageErrorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  if ("name" in error && typeof error.name === "string") return error.name;
  if ("Code" in error && typeof error.Code === "string") return error.Code;

  return undefined;
}

function isMissingObjectError(error: unknown): boolean {
  const errorName = getStorageErrorName(error);

  return getStorageStatus(error) === 404 && (errorName === "NoSuchKey" || errorName === "NotFound");
}

export class ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly signingClient: S3Client;

  constructor(configuration: StorageConfiguration) {
    this.bucket = configuration.bucket;
    this.client = createStorageClient(configuration);
    this.signingClient = createStorageClient({
      ...configuration,
      endpoint: configuration.signingEndpoint ?? configuration.endpoint,
    });
  }

  async signUpload({ key, contentType, byteSize, issuedAt }: SignUploadParams): Promise<string> {
    return createUploadUrl({
      client: this.signingClient,
      bucket: this.bucket,
      key,
      contentType,
      byteSize,
      issuedAt,
    });
  }

  async getObject({ key, maxBytes }: GetObjectParams): Promise<Buffer | null> {
    const abortSignal = AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS);

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal },
      );

      if (!response.Body) throw new Error("Storage returned no object body");

      return await readBoundedObject({
        body: response.Body as AsyncIterable<Uint8Array> & { destroy?: () => void },
        contentLength: response.ContentLength,
        maxBytes,
        signal: abortSignal,
      });
    } catch (error) {
      if (isMissingObjectError(error)) return null;
      throw error;
    }
  }

  async headObject(key: string): Promise<ObjectMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS) },
      );

      return { byteSize: response.ContentLength, contentType: response.ContentType };
    } catch (error) {
      if (isMissingObjectError(error)) return null;
      throw error;
    }
  }

  async putObjectIfAbsent({
    key,
    bytes,
    contentType,
  }: PutObjectIfAbsentParams): Promise<"created" | "exists"> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
          IfNoneMatch: "*",
        }),
        { abortSignal: AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS) },
      );

      return "created";
    } catch (error) {
      if (getStorageStatus(error) === 412) return "exists";
      throw error;
    }
  }

  destroy(): void {
    this.client.destroy();
    this.signingClient.destroy();
  }

  onModuleDestroy(): void {
    this.destroy();
  }
}
