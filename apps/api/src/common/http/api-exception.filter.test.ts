import { describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter } from "./api-exception.filter";

describe("ApiExceptionFilter", () => {
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
});
