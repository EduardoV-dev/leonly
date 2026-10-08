import { expect, it, vi } from "vitest";
import { regeneratePartnerInvite } from "./regenerate-partner-invite";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios/api", () => ({
  api: { post },
  isAxiosError: () => false,
}));

it("reports failure when the regeneration response contains no invite", async () => {
  post.mockResolvedValue({
    data: { ok: true, data: null, error: [], message: "Request completed successfully" },
  });

  await expect(regeneratePartnerInvite()).resolves.toEqual({ status: "failed" });
});
