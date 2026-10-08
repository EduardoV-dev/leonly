import { HttpException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter } from "./api-exception.filter";

describe("ApiExceptionFilter", () => {
  it.each([400, 401, 403, 404, 409, 429, 500, 503])(
    "provides a complete error body for HTTP %s without leaking server details",
    (status) => {
      const reply = vi.fn();
      const filter = new ApiExceptionFilter(
        { httpAdapter: { reply } } as never,
        { error: vi.fn() } as never,
      );
      const host = { switchToHttp: () => ({ getResponse: () => ({}) }) } as never;
      const exception = new HttpException(
        status >= 500 ? { error: "private database detail" } : {},
        status,
      );

      filter.catch(exception, host);

      const response = reply.mock.calls[0][1];
      expect(reply).toHaveBeenCalledWith({}, response, status);
      expect(response).toEqual({
        ok: false,
        data: null,
        error: [
          { code: status === 500 ? "INTERNAL_ERROR" : `HTTP_${status}`, message: response.message },
        ],
        message: expect.any(String),
      });
      expect(response.message).not.toBe("Request failed.");
      expect(JSON.stringify(response)).not.toContain("private database detail");
    },
  );

  it("logs the original unhandled error and returns a generic response", () => {
    const reply = vi.fn();
    const logger = { error: vi.fn() };
    const filter = new ApiExceptionFilter({ httpAdapter: { reply } } as never, logger as never);
    const error = new Error("private database detail");
    const host = {
      switchToHttp: () => ({ getResponse: () => ({}) }),
    } as never;

    filter.catch(error, host);

    expect(logger.error).toHaveBeenCalledWith({ err: error }, "Unhandled API error");
    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        ok: false,
        message: "We could not complete your request. Please try again.",
      }),
      500,
    );
  });

  it.each([400, 409, 500])("discards exception response data for HTTP %s", (status) => {
    const reply = vi.fn();
    const filter = new ApiExceptionFilter(
      { httpAdapter: { reply } } as never,
      { error: vi.fn() } as never,
    );
    const host = { switchToHttp: () => ({ getResponse: () => ({}) }) } as never;
    const currentValue = {
      displayName: "Current name",
      status: "conflict",
      updatedAt: "2026-09-05T16:00:00.123456Z",
    };

    filter.catch(new HttpException({ data: currentValue }, status), host);

    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ ok: false, data: null }),
      status,
    );
  });
});
