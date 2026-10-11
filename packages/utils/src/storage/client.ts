import { S3Client } from "@aws-sdk/client-s3";

export type StorageConfiguration = {
  endpoint?: string;
  signingEndpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export function validateStorageConfiguration(config: StorageConfiguration): StorageConfiguration {
  const fields = ["region", "bucket"] as const;

  for (const field of fields) {
    if (!config[field]?.trim()) throw new Error(`Storage ${field} is required`);
  }

  const hasExplicitCredentials =
    config.accessKeyId !== undefined || config.secretAccessKey !== undefined;

  if (hasExplicitCredentials) {
    for (const field of ["accessKeyId", "secretAccessKey"] as const) {
      if (!config[field]?.trim()) throw new Error(`Storage ${field} is required`);
    }
  }

  for (const endpoint of [config.endpoint, config.signingEndpoint]) {
    if (endpoint === undefined) continue;

    let url: URL;

    try {
      url = new URL(endpoint);
    } catch {
      throw new Error("Storage endpoint must be an absolute HTTP(S) URL");
    }

    const hasInvalidProtocol = url.protocol !== "https:" && url.protocol !== "http:";
    const hasInvalidAuthority = url.username || url.password || url.search || url.hash;

    if (hasInvalidProtocol || hasInvalidAuthority || url.pathname !== "/") {
      throw new Error("Storage endpoint must be an HTTP(S) origin without credentials");
    }
  }
  return config;
}

export function createStorageClient(configuration: StorageConfiguration): S3Client {
  const config = validateStorageConfiguration(configuration);
  const credentials =
    config.accessKeyId && config.secretAccessKey
      ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
      : undefined;

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials,
    forcePathStyle: config.endpoint !== undefined,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 1,
  });
}
