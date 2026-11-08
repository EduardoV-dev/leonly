import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/axios/api";
import { i18n } from "@/lib/i18n";
import { MemoryComments } from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/axios/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const memoryId = "01900000-0000-7000-8000-000000000004";
const comment = {
  deletedAt: null,
  id: "01900000-0000-7000-8000-000000000005",
  memoryId,
  parentCommentId: null,
  body: "A lovely day",
  createdAt: "2026-09-05T16:00:00.123456Z",
  updatedAt: "2026-09-05T16:00:00.123456Z",
  authorDisplayName: "Sarah",
  authorAvatarUrl: null,
  isAuthor: true,
  replyCount: 1,
};
const success = (data: unknown) => ({
  status: 200,
  data: { ok: true, data, error: [], message: "" },
});
const page = (data: unknown[]) => success({ data, meta: { nextCursor: null, resetCursor: false } });

function renderComments() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryComments memoryId={memoryId} />
    </QueryClientProvider>,
  );
}

describe("MemoryComments", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("loads comments and expands replies on demand", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockResolvedValueOnce(
        page([
          {
            ...comment,
            id: "01900000-0000-7000-8000-000000000006",
            body: "A reply",
            parentCommentId: comment.id,
            isAuthor: false,
            replyCount: 0,
          },
        ]),
      );
    renderComments();
    expect(await screen.findByText("A lovely day")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    expect(await screen.findByText("A reply")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      `/memories/${memoryId}/comments/${comment.id}/replies`,
      expect.any(Object),
    );
  });

  it("shows a deleted root without its author or a reply composer", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(
        page([
          {
            deletedAt: "2026-09-05T16:01:00.123456Z",
            id: comment.id,
            memoryId,
            createdAt: comment.createdAt,
            replyCount: 1,
          },
        ]),
      )
      .mockResolvedValueOnce(page([]));
    renderComments();
    expect(await screen.findByText("Comment deleted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Sarah")).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: "Comment" })).toHaveLength(1);
  });

  it("keeps the draft and offers retry after submission failure", async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    vi.mocked(api.post).mockRejectedValue(new Error("offline"));
    renderComments();
    const input = await screen.findByRole("textbox", { name: "Comment" });
    fireEvent.change(input, { target: { value: "Keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(input).toHaveValue("Keep this");
  });

  it("submits a reply under its root using the reply composer", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockResolvedValue(page([]));
    vi.mocked(api.post).mockResolvedValue(
      success({
        ...comment,
        id: "01900000-0000-7000-8000-000000000006",
        parentCommentId: comment.id,
        body: "A reply",
      }),
    );
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    const input = await screen.findByRole("textbox", { name: "Reply" });
    fireEvent.change(input, { target: { value: "A reply" } });
    fireEvent.submit(screen.getByRole("form", { name: "Reply composer" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        `/memories/${memoryId}/comments`,
        {
          body: "A reply",
          parentCommentId: comment.id,
        },
        expect.any(Object),
      ),
    );
  });

  it("preserves the attempted edit and requires refresh after a conflict", async () => {
    vi.mocked(api.get).mockResolvedValue(page([comment]));
    vi.mocked(api.patch).mockResolvedValue({
      status: 409,
      data: { ok: false, data: null, error: [], message: "conflict" },
    });
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByRole("textbox", { name: /Edit comment/ });
    fireEvent.change(input, { target: { value: "My edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    expect(input).toHaveValue("My edit");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(
      `/memories/${memoryId}/comments/${comment.id}`,
      { body: "My edit", lastKnownUpdatedAt: comment.updatedAt },
      expect.any(Object),
    );
  });

  it("keeps the conflicting draft visible when refreshing fails", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockRejectedValue(new Error("offline"));
    vi.mocked(api.patch).mockResolvedValue({
      status: 409,
      data: { ok: false, data: null, error: [], message: "conflict" },
    });
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByRole("textbox", { name: /Edit comment/ });
    fireEvent.change(input, { target: { value: "Keep my draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(await screen.findByRole("button", { name: "Refresh comment" }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(input).toHaveValue("Keep my draft");
    expect(screen.getByRole("button", { name: "Refresh comment" })).toBeInTheDocument();
  });

  it("retries the failed next reply page", async () => {
    const reply = {
      ...comment,
      id: "01900000-0000-7000-8000-000000000006",
      parentCommentId: comment.id,
      body: "First reply",
    };
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockResolvedValueOnce(
        success({ data: [reply], meta: { nextCursor: "next", resetCursor: false } }),
      )
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(
        page([{ ...reply, id: "01900000-0000-7000-8000-000000000007", body: "Second reply" }]),
      );
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    await screen.findByText("First reply");
    fireEvent.click(screen.getByRole("button", { name: "Load more replies" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Second reply")).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls[3]?.[1]).toEqual({ params: { cursor: "next" } });
  });

  it("announces a deleted reply and restores focus", async () => {
    const reply = {
      ...comment,
      id: "01900000-0000-7000-8000-000000000006",
      parentCommentId: comment.id,
      body: "My reply",
    };
    let deleted = false;
    vi.mocked(api.get).mockImplementation(async (url) =>
      String(url).endsWith("/replies") ? page(deleted ? [] : [reply]) : page([comment]),
    );
    vi.mocked(api.delete).mockImplementation(async () => {
      deleted = true;
      return success({ deletedCommentId: reply.id });
    });
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Show replies (1)" }));
    await screen.findByText("My reply");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete comment" })[1]);
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Remove this comment?" })).getByRole("button", {
        name: "Delete comment",
      }),
    );
    await waitFor(() => expect(screen.queryByText("My reply")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Comments" })).toHaveFocus());
    expect(screen.getByText("Comment deleted.")).toBeInTheDocument();
  });

  it("shows the saved comment after a successful edit", async () => {
    const updated = { ...comment, body: "Updated text", updatedAt: "2026-09-05T16:01:00.123456Z" };
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockResolvedValue(page([updated]));
    vi.mocked(api.patch).mockResolvedValue(success(updated));
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Edit comment/ }), {
      target: { value: "Updated text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByText("Comment updated.")).toHaveAttribute("role", "status"),
    );
    expect(screen.getByText("Updated text")).toBeInTheDocument();
  });

  it("prevents duplicate deletion while the request is pending", async () => {
    let resolveDelete: (value: ReturnType<typeof success>) => void = () => {};
    vi.mocked(api.get)
      .mockResolvedValueOnce(page([comment]))
      .mockResolvedValue(page([]));
    vi.mocked(api.delete).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );
    renderComments();
    await screen.findByText("A lovely day");
    fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));
    const dialog = screen.getByRole("dialog", { name: "Remove this comment?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete comment" }));
    expect(await within(dialog).findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Keep comment" })).toBeDisabled();
    expect(api.delete).toHaveBeenCalledTimes(1);
    resolveDelete(success({ deletedCommentId: comment.id }));
    await waitFor(() => expect(screen.queryByText("A lovely day")).not.toBeInTheDocument());
  });
});
