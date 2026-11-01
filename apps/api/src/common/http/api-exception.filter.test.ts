import { HttpException } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { ExpressAdapter } from "@nestjs/platform-express";
import { PinoLogger } from "nestjs-pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter } from "./api-exception.filter";

class FilterFixture {
  readonly adapter = new ExpressAdapter();
  readonly adapterHost = new HttpAdapterHost();
  readonly logger = new PinoLogger({ pinoHttp: { level: "silent" } });
  readonly reply = vi.spyOn(this.adapter, "reply").mockImplementation(() => {});
  readonly error = vi.spyOn(this.logger, "error").mockImplementation(() => {});
  readonly host = new ExecutionContextHost([{}, {}]);
  readonly filter: ApiExceptionFilter;

  constructor() {
    this.adapterHost.httpAdapter = this.adapter;
    this.filter = new ApiExceptionFilter(this.adapterHost, this.logger);
  }
}

afterEach(() => vi.restoreAllMocks());

describe("ApiExceptionFilter", () => {
  it.each([500, 503])("redacts arbitrary structured diagnostics on HTTP %s", (status) => {
    const { filter, host, reply } = new FilterFixture();
    const exception = new HttpException(
      { errors: [{ code: "PRIVATE", message: "Provider secret" }] },
      status,
    );

    filter.catch(exception, host);

    expect(reply).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ ok: false, data: null }),
      status,
    );
    expect(JSON.stringify(reply.mock.calls)).not.toContain("Provider secret");
  });

  it.each([400, 401, 403, 404, 409, 429, 500, 503])(
    "provides a complete error body for HTTP %s without leaking server details",
    (status) => {
      const { filter, host, reply } = new FilterFixture();
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
    const { filter, host, reply, error: logError } = new FilterFixture();
    const error = new Error("private database detail");

    filter.catch(error, host);

    expect(logError).toHaveBeenCalledWith({ err: error }, "Unhandled API error");
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
    const { filter, host, reply } = new FilterFixture();
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
