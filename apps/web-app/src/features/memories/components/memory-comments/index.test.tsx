import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryComments } from ".";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const FIRST_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const SECOND_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const AVATAR_URL = "https://cdn.example.com/sarah.jpg";

const comment = {
  authorAvatarUrl: AVATAR_URL,
  authorDisplayName: "Sarah Green",
  body: "The flowers were still warm from the sun.",
  createdAt: "2026-08-23T10:00:00.000Z",
  id: FIRST_ID,
  isAuthor: false,
  memoryId: MEMORY_ID,
  updatedAt: "2026-08-23T10:00:00.000Z",
  version: 1,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function renderComments() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryComments memoryId={MEMORY_ID} />
      </QueryClientProvider>,
    ),
  };
}

async function settle(): Promise<void> {
  await waitFor(() =>
    expect(screen.queryByRole("status", { name: "Loading comments" })).not.toBeInTheDocument(),
  );
}

describe("MemoryComments", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "11111111-1111-4111-8111-111111111111") });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the editorial semantic composition and inert newest-first notes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        comments: [
          comment,
          { ...comment, authorAvatarUrl: null, id: SECOND_ID, body: "A second note." },
        ],
        cursorReset: false,
        nextCursor: null,
      }),
    );

    renderComments();
    await settle();

    expect(screen.getByRole("heading", { name: "Comments" })).toBeInTheDocument();
    expect(screen.queryByText("Shared notes")).not.toBeInTheDocument();
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Comment" })).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Comment" });
    expect(submit).toBeDisabled();
    expect(submit.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Comments" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("Sarah Green")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Sarah Green" })).toHaveAttribute("src", AVATAR_URL);
    expect(screen.queryByText("SG")).not.toBeInTheDocument();
    expect(screen.getByText("A second note.")).toBeInTheDocument();
    expect(screen.getByText("The flowers were still warm from the sun.")).toBeInTheDocument();

    const body = screen.getByText("The flowers were still warm from the sun.");
    expect(body).not.toContainHTML("<script>");
  });

  it("keeps the empty composer disabled, focuses validation, and preserves its draft", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ comments: [], cursorReset: false, nextCursor: null }),
    );
    renderComments();
    await settle();

    const textarea = screen.getByRole("textbox", { name: "Comment" });
    const form = screen.getByRole("form");
    const submit = screen.getByRole("button", { name: "Comment" });
    expect(submit).toBeDisabled();
    expect(submit.querySelector("svg")).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.submit(form);

    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveValue("   ");
    expect(textarea).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a comment.");
    expect(screen.getAllByText(/Enter a comment\./)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "No comments yet" })).toBeInTheDocument();
  });

  it("submits from the form, freezes pending state, then clears and announces the canonical note", async () => {
    let resolveCreate: (response: Response) => void = () => undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ comments: [], cursorReset: false, nextCursor: null }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveCreate = resolve;
          }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ comments: [comment], cursorReset: false, nextCursor: null }),
      );
    renderComments();
    await settle();

    const textarea = screen.getByRole("textbox", { name: "Comment" });
    fireEvent.change(textarea, { target: { value: "A note from the garden" } });
    fireEvent.blur(textarea);
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Commenting…" })).toBeDisabled());
    expect(textarea).toBeDisabled();

    resolveCreate(jsonResponse({ comment }));
    await waitFor(() => expect(screen.getByText(comment.body)).toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Comment" })).toHaveValue("");
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Comment added.");
    expect(screen.getAllByText(comment.body)).toHaveLength(1);
  });

  it("preserves a failed submission and exposes retry, then supports earlier-page recovery", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ comments: [comment], cursorReset: false, nextCursor: "next" }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: "failed" }, 500))
      .mockResolvedValueOnce(jsonResponse({ comment }))
      .mockResolvedValueOnce(
        jsonResponse({ comments: [comment], cursorReset: false, nextCursor: "next" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          comments: [{ ...comment, id: SECOND_ID, body: "Earlier note." }],
          cursorReset: false,
          nextCursor: null,
        }),
      );
    renderComments();
    await settle();

    const textarea = screen.getByRole("textbox", { name: "Comment" });
    fireEvent.change(textarea, { target: { value: "Keep this text" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Your text is still here."),
    );
    expect(textarea).toHaveValue("Keep this text");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(textarea).toHaveValue(""));
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Load earlier comments" }));
    await waitFor(() => expect(screen.getByText("Earlier note.")).toBeInTheDocument());
    expect(screen.getAllByText("Sarah Green")).toHaveLength(2);
  });

  it("replaces stale notes after a cursor refresh and routes unavailable mutations to not-found", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ comments: [comment], cursorReset: false, nextCursor: "next" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          comments: [{ ...comment, id: SECOND_ID, body: "Refreshed note." }],
          cursorReset: true,
          nextCursor: null,
        }),
      );
    const { queryClient } = renderComments();
    await settle();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Load earlier comments" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Load earlier comments" }));
    await waitFor(() => expect(screen.getByText("Refreshed note.")).toBeInTheDocument());
    expect(screen.queryByText(comment.body)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Comments were refreshed.");

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ code: "unavailable" }, 404));
    const textarea = screen.getByRole("textbox", { name: "Comment" });
    fireEvent.change(textarea, { target: { value: "A final note" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(queryClient.getQueryData(["memories", "comments", MEMORY_ID])).toBeUndefined();
  });

  it("lets only an author edit and reconciles a successful keyboard save", async () => {
    const authoredComment = { ...comment, isAuthor: true };
    const updatedComment = {
      ...authoredComment,
      body: "The flowers were brighter than I remembered.",
      updatedAt: "2026-08-23T11:00:00.000Z",
      version: 2,
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ comments: [authoredComment], cursorReset: false, nextCursor: null }),
      )
      .mockResolvedValueOnce(jsonResponse({ comment: updatedComment }))
      .mockResolvedValueOnce(
        jsonResponse({ comments: [updatedComment], cursorReset: false, nextCursor: null }),
      );
    renderComments();
    await settle();

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const textarea = screen.getByRole("textbox", { name: "Edit comment by Sarah Green" });
    fireEvent.change(textarea, { target: { value: updatedComment.body } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByText(updatedComment.body)).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      `/api/memories/${MEMORY_ID}/comments/${FIRST_ID}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(screen.getByText("Comment updated.")).toHaveAttribute("role", "status");
  });

  it("preserves an outdated draft until the author refreshes or cancels", async () => {
    const authoredComment = { ...comment, isAuthor: true };
    const currentComment = {
      ...authoredComment,
      body: "Your partner's newer note.",
      updatedAt: "2026-08-23T11:00:00.000Z",
      version: 2,
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ comments: [authoredComment], cursorReset: false, nextCursor: null }),
      )
      .mockResolvedValueOnce(jsonResponse({ code: "conflict" }, 409))
      .mockResolvedValueOnce(
        jsonResponse({ comments: [currentComment], cursorReset: false, nextCursor: null }),
      );
    renderComments();
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const textarea = screen.getByRole("textbox", { name: "Edit comment by Sarah Green" });
    fireEvent.change(textarea, { target: { value: "My preserved draft." } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("changed while you were editing"),
    );
    expect(textarea).toHaveValue("My preserved draft.");
    fireEvent.click(screen.getByRole("button", { name: "Refresh comment" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(textarea).toHaveValue("My preserved draft.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByText(currentComment.body)).toBeInTheDocument());
  });
});
