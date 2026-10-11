import { afterEach, describe, expect, it, vi } from "vitest";
import { createSqsClient, SendMessageCommand, SQSClient } from "./client";
import { publishMessage } from "./publisher";

afterEach(() => vi.restoreAllMocks());

describe("queue publishing", () => {
  it("serializes the payload and forwards cancellation before returning the acknowledgment", async () => {
    const send = vi
      .spyOn(SQSClient.prototype, "send")
      .mockImplementation(async () => ({ MessageId: "accepted" }));
    const client = createSqsClient({ region: "us-east-1" });
    const abortSignal = new AbortController().signal;
    const queueUrl = "https://sqs.us-east-1.amazonaws.com/123456789012/images";
    try {
      await expect(
        publishMessage({ client, queueUrl, payload: { eventId: "event" }, abortSignal }),
      ).resolves.toBe("accepted");
      const [command, options] = send.mock.calls[0];
      expect(command).toBeInstanceOf(SendMessageCommand);
      expect((command as SendMessageCommand).input).toEqual({
        QueueUrl: queueUrl,
        MessageBody: '{"eventId":"event"}',
      });
      expect(options).toEqual({ abortSignal });
      send.mockImplementationOnce(async () => ({}));
      await expect(publishMessage({ client, queueUrl, payload: {} })).rejects.toThrow(
        "SQS acknowledgment is missing",
      );
      send.mockRejectedValueOnce(new Error("Queue unavailable"));
      await expect(publishMessage({ client, queueUrl, payload: {} })).rejects.toThrow(
        "Queue unavailable",
      );
    } finally {
      client.destroy();
    }
  });
});
