import { SendMessageCommand, type SQSClient, validateSqsUrl } from "./client";

export async function publishMessage<T>(options: {
  client: SQSClient;
  queueUrl: string;
  payload: T;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const { client, queueUrl, payload, abortSignal } = options;

  validateSqsUrl(queueUrl);

  const response = await client.send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(payload) }),
    { abortSignal },
  );

  if (!response.MessageId) throw new Error("SQS acknowledgment is missing");

  return response.MessageId;
}
