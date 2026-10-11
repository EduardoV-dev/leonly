import { SQSClient } from "@aws-sdk/client-sqs";

export { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export type SqsConfiguration = {
  region: string;
  endpoint?: string;
};

export function validateSqsUrl(endpoint: string): void {
  const url = new URL(endpoint);
  const isValidEndpoint =
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash;

  if (!isValidEndpoint) throw new Error("Invalid SQS endpoint");
}

export function createSqsClient(configuration: SqsConfiguration): SQSClient {
  if (!configuration.region?.trim()) throw new Error("SQS region is required");
  if (configuration.endpoint !== undefined) validateSqsUrl(configuration.endpoint);

  return new SQSClient({ ...configuration, maxAttempts: 1 });
}
