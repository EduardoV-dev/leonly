import { describe, expect, it } from "vitest";
import { parseSqsQueuesUrls } from "./parse-sqs-queues-urls";

describe("parseSqsQueuesUrls", () => {
  it("returns an empty map when no queue URLs are configured", () => {
    expect(parseSqsQueuesUrls("")).toEqual({});
  });

  it("parses kebab-case queue URLs", () => {
    expect(
      parseSqsQueuesUrls(
        '{"memories":"https://sqs.example.com/memories","email-notifications":"https://sqs.example.com/email"}',
      ),
    ).toEqual({
      memories: "https://sqs.example.com/memories",
      "email-notifications": "https://sqs.example.com/email",
    });
  });

  it("rejects malformed JSON and non-object values", () => {
    expect(() => parseSqsQueuesUrls("{")).toThrow("SQS_QUEUES_URLS must be valid JSON");
    expect(() => parseSqsQueuesUrls("[]")).toThrow(
      "SQS_QUEUES_URLS must be a JSON object of queue URLs",
    );
  });

  it("rejects invalid queue names and empty URLs", () => {
    expect(() =>
      parseSqsQueuesUrls('{"emailNotifications":"https://sqs.example.com/email"}'),
    ).toThrow('SQS_QUEUES_URLS key "emailNotifications" must use kebab-case');
    expect(() => parseSqsQueuesUrls('{"memories":" "}')).toThrow(
      'SQS_QUEUES_URLS["memories"] must be a non-empty string',
    );
  });
});
