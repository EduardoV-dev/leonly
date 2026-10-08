import type { ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { ApiResponseInterceptor } from "./api-response.interceptor";

describe("ApiResponseInterceptor", () => {
  it.each([200, 400, 409, 500, 503])(
    "preserves handler response data for HTTP %s",
    async (statusCode) => {
      const context = {
        switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
      } as ExecutionContext;
      const interceptor = new ApiResponseInterceptor();

      const response = await firstValueFrom(
        interceptor.intercept(context, { handle: () => of({ name: "Current name" }) }),
      );

      expect(response).toMatchObject({ ok: statusCode < 400, data: { name: "Current name" } });
    },
  );

  it.each([200, 409])("normalizes missing handler data to null for HTTP %s", async (statusCode) => {
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
    } as ExecutionContext;
    const interceptor = new ApiResponseInterceptor();

    const response = await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(undefined) }),
    );

    expect(response).toMatchObject({ ok: statusCode < 400, data: null });
  });
});
