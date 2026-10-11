import { parseImageEvent } from "@leonly/utils/contracts";
import { type SendMessageCommand, SQSClient } from "@leonly/utils/queue";
import { Logger } from "@nestjs/common";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCreationFixtures, creationRequest } from "../../modules/memories/creation-fixtures";
import type { PrismaService } from "../prisma/prisma.service";
import { OutboxPublisher } from "./outbox-publisher";

describe("committed creation publication and operator replay", () => {
  let fixtures: ReturnType<typeof createCreationFixtures>;
  let publisher: OutboxPublisher;
  let bytes: Buffer;
  const send = vi.spyOn(SQSClient.prototype, "send");
  beforeEach(async () => {
    send.mockReset();
    fixtures = createCreationFixtures();
    publisher = new OutboxPublisher(fixtures.prisma as unknown as PrismaService, {
      routes: {
        ImageVariantsRequested: {
          queueUrl: "http://localhost:4566/000000000000/images",
          validate: parseImageEvent,
        },
        NotificationRequested: {
          queueUrl: "http://localhost:4566/000000000000/notifications",
          validate: (envelope) => {
            if (envelope.aggregateType !== "notification") throw new Error("Invalid notification");
          },
        },
      },
      region: "us-east-1",
    });
    fixtures.publisher.publish.mockImplementation((options) => publisher.publish(options));
    bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    send.mockImplementation(async () => {
      expect(fixtures.state.inTransaction).toBe(false);
      expect(fixtures.state.memories).toHaveLength(1);
      return { MessageId: "accepted" };
    });
  });
  afterEach(() => publisher.onModuleDestroy());

  async function create(count = 1) {
    const uploads = Array.from({ length: count }, () => fixtures.addUpload(bytes));
    return fixtures.memories.create({
      userId: "user-a",
      body: creationRequest(uploads.map(({ id }) => id)),
    });
  }
  it("sends stable envelopes only after commit and marks acknowledgment separately from readiness", async () => {
    await create();
    const body = JSON.parse(
      (send.mock.calls[0][0] as SendMessageCommand).input.MessageBody as string,
    );
    expect(body.id).toBe(fixtures.state.events[0].id);
    expect(Object.keys(body).sort()).toEqual([
      "aggregateId",
      "aggregateType",
      "createdAt",
      "eventType",
      "id",
      "payload",
      "schemaVersion",
    ]);
    expect(fixtures.state.events[0].publishedAt).toBeInstanceOf(Date);
    expect(fixtures.state.events[0].publicationAttempts).toBe(1);
    expect(fixtures.state.objects.filter(({ status }) => status === "pending")).toHaveLength(2);
  });
  it("never sends rolled-back events", async () => {
    fixtures.prisma.outboxEvent.create.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(create()).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(fixtures.state.events).toHaveLength(0);
  });
  it("preserves committed success on a failed send and supports repeated bounded replay", async () => {
    send.mockRejectedValueOnce(new Error("private credential details"));
    const result = await create();
    expect(result.id).toBe(fixtures.state.memories[0].id);
    expect(fixtures.state.events[0]).toMatchObject({
      publishedAt: null,
      publicationAttempts: 1,
      lastPublicationError: "PUBLICATION_SEND_FAILED",
    });
    const id = fixtures.state.events[0].id as string;
    await publisher.publish({ ids: [id], limit: 1 });
    expect(
      JSON.parse((send.mock.calls[1][0] as SendMessageCommand).input.MessageBody as string).id,
    ).toBe(id);
    expect(await publisher.publish({ ids: [id], limit: 1 })).toEqual([]);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("tracks mixed per-image outcomes and replays only unpublished selections", async () => {
    send.mockRejectedValueOnce(new Error("queue unavailable"));
    await create(2);
    expect(fixtures.state.events.map(({ publishedAt }) => publishedAt !== null)).toEqual([
      false,
      true,
    ]);
    await publisher.publish({ limit: 1 });
    expect(send).toHaveBeenCalledTimes(3);
    expect(fixtures.state.events.every(({ publishedAt }) => publishedAt !== null)).toBe(true);
  });
  it("reuses the event identity after acceptance before bookkeeping failure", async () => {
    fixtures.prisma.outboxEvent.updateMany.mockRejectedValueOnce(new Error("database unavailable"));
    await create();
    expect(fixtures.state.events[0]).toMatchObject({
      publishedAt: null,
      lastPublicationError: "PUBLICATION_BOOKKEEPING_FAILED",
    });
    await publisher.publish({ limit: 1 });
    expect((send.mock.calls[0][0] as SendMessageCommand).input.MessageBody).toBe(
      (send.mock.calls[1][0] as SendMessageCommand).input.MessageBody,
    );
  });
  it("preserves committed success when publisher lookup fails", async () => {
    fixtures.prisma.outboxEvent.findMany.mockRejectedValueOnce(new Error("lookup unavailable"));
    await expect(create()).resolves.toMatchObject({ visibility: "timeline" });
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects unbounded selections", async () => {
    await expect(publisher.publish({ limit: 101 })).rejects.toThrow("limit");
    expect(fixtures.prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });
  it("routes a different event type to its own queue without requiring an image payload", async () => {
    send.mockRejectedValueOnce(new Error("queue unavailable"));
    await create();
    const event = fixtures.state.events[0];
    Object.assign(event, {
      eventType: "NotificationRequested",
      aggregateType: "notification",
      payload: { message: "A new notification" },
    });
    await publisher.publish({ limit: 1 });
    const command = send.mock.calls[1][0] as SendMessageCommand;
    expect(command.input.QueueUrl).toBe("http://localhost:4566/000000000000/notifications");
    expect(JSON.parse(command.input.MessageBody as string)).toMatchObject({
      id: event.id,
      eventType: "NotificationRequested",
      payload: { message: "A new notification" },
    });
    expect(event.publishedAt).toBeInstanceOf(Date);
  });
  it.each(["UnknownEvent", "toString"])(
    "leaves unrouted %s events unpublished",
    async (eventType) => {
      send.mockRejectedValueOnce(new Error("queue unavailable"));
      await create();
      fixtures.state.events[0].eventType = eventType;
      await expect(publisher.publish({ limit: 1 })).resolves.toEqual([
        { id: fixtures.state.events[0].id, status: "failed" },
      ]);
      expect(send).toHaveBeenCalledOnce();
      expect(fixtures.state.events[0]).toMatchObject({
        publishedAt: null,
        lastPublicationError: "PUBLICATION_ROUTE_MISSING",
      });
    },
  );
  it("validates image events before sending them", async () => {
    send.mockRejectedValueOnce(new Error("queue unavailable"));
    await create();
    fixtures.state.events[0].schemaVersion = 2;
    await publisher.publish({ limit: 1 });
    expect(send).toHaveBeenCalledOnce();
    expect(fixtures.state.events[0]).toMatchObject({
      publishedAt: null,
      lastPublicationError: "PUBLICATION_VALIDATION_FAILED",
    });
  });
  it("reports bookkeeping failures through the logger without leaking provider errors", async () => {
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    fixtures.prisma.outboxEvent.updateMany.mockRejectedValue(
      new Error("private credential details"),
    );
    try {
      await create();
      expect(log).toHaveBeenCalledWith({
        event: "outbox_bookkeeping_failed",
        eventId: fixtures.state.events[0].id,
        code: "PUBLICATION_BOOKKEEPING_FAILED",
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain("private credential details");
    } finally {
      log.mockRestore();
    }
  });
  it("reports untouched events as deferred when the shared send budget expires", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    send.mockImplementationOnce(async () => {
      controller.abort();
      return { MessageId: "accepted" };
    });
    try {
      await create(2);
      expect(send).toHaveBeenCalledOnce();
      expect(fixtures.state.events.map(({ publicationAttempts }) => publicationAttempts)).toEqual([
        1, 0,
      ]);
      await expect(fixtures.publisher.publish.mock.results[0].value).resolves.toEqual([
        { id: fixtures.state.events[0].id, status: "published" },
        { id: fixtures.state.events[1].id, status: "deferred" },
      ]);
    } finally {
      timeout.mockRestore();
    }
  });
});
