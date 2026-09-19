import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import type { MemoryEdit } from "../../types/memory-edit";
import { EditMemoryPage } from ".";

const { pushMock, refreshMock, signedUploadMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signedUploadMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/utils/toast", () => ({ toast: { success: toastSuccessMock } }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: signedUploadMock }) } }),
}));
vi.mock("@/components/past-date-picker", () => ({
  PastDatePicker: ({
    label,
    onChange,
    value,
  }: {
    label: string;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const memory: MemoryEdit = {
  coverPhotoId: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  description: "A quiet afternoon together.",
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  initialVisibility: "timeline",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  photos: [
    {
      id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
      previewUrl: "https://storage.example/photo",
    },
  ],
  title: "Among the flowers",
  version: "opaque-version",
};

function renderEditor(editableMemory: MemoryEdit = memory) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditMemoryPage memory={editableMemory} />
    </QueryClientProvider>,
  );
}

describe("EditMemoryPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    signedUploadMock.mockResolvedValue({ error: null });
    await i18n.changeLanguage("en");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("crypto", { randomUUID: () => "a9c28177-afb7-456e-a83d-8ef74047226f" });
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders the shared form UI with every editable value and retained cover prefilled", () => {
    renderEditor();

    expect(screen.getByRole("heading", { name: "Refine This Memory" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Among the flowers");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-20");
    expect(screen.getByLabelText("Location")).toHaveValue("The botanical gardens");
    expect(screen.getByLabelText("The story")).toHaveValue("A quiet afternoon together.");
    expect(screen.getByRole("radio", { name: /Our timeline/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Cover/i })).toBeChecked();
    expect(screen.queryByText("Saved photo")).not.toBeInTheDocument();
    expect(screen.getByText("1/10")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      `/memories/${memory.id}`,
    );
  });

  it("adds and removes draft photos, changes cover and placement, and submits the backend contract", async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(async (_url, request) => {
        if (!(request?.body instanceof FormData)) throw new Error("Expected photo form data.");
        const photoId = request.body.get("photoIds");
        return Response.json({
          grant: "signed-edit-grant",
          uploads: [
            {
              id: photoId,
              path: "space/temporary/mutation/photo/original",
              token: "upload-token",
            },
          ],
        });
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: memory.id, visibility: "vault" }), { status: 200 }),
      );
    renderEditor();
    const replacement = new File(["photo"], "replacement.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [replacement] },
    });
    expect(screen.queryByText("New photo")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio", { name: /cover/i })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    fireEvent.click(screen.getByRole("radio", { name: /Private vault/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, request] = vi.mocked(fetch).mock.calls[1];
    const body = JSON.parse(request?.body as string) as { grant: string };
    expect(url).toBe(`/api/memories/${memory.id}/edit`);
    expect(request?.method).toBe("PATCH");
    expect(request?.headers).toEqual({ "content-type": "application/json" });
    expect(body).toEqual({ grant: "signed-edit-grant" });
    expect(signedUploadMock).toHaveBeenCalledWith(
      "space/temporary/mutation/photo/original",
      "upload-token",
      replacement,
      { contentType: "image/png" },
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/vault/${memory.id}`));
    expect(toastSuccessMock).toHaveBeenCalledWith("Memory updated.");
  });

  it("enforces the ten-photo final count", () => {
    renderEditor({
      ...memory,
      photos: Array.from({ length: 10 }, (_, index) => ({
        id: `00000000-0000-4000-8000-00000000000${index}`,
        previewUrl: `https://storage.example/${index}`,
      })),
    });

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [new File(["six"], "six.png", { type: "image/png" })] },
    });

    expect(screen.getByText("Choose up to 10 photos in the final memory.")).toBeInTheDocument();
    expect(screen.getByText("10/10")).toBeInTheDocument();
  });

  it("allows removing every photo and submits no cover", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ grant: "metadata-edit-grant", uploads: [] }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: memory.id, visibility: "timeline" }), { status: 200 }),
      );
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(screen.getByText("This memory will use its no-photo presentation.")).toBeInTheDocument();
    expect(screen.getByText("0/10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(body.getAll("retainedPhotoIds")).toEqual([]);
    expect(body.has("coverPhotoId")).toBe(false);
    expect(body.has("coverPhotoIndex")).toBe(false);
  });

  it("preserves the draft and idempotency key for a recoverable retry", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ grant: "retry-edit-grant", uploads: [] }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Please try again." }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: memory.id, visibility: "timeline" }), { status: 200 }),
      );
    renderEditor();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Revised title" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again.");
    expect(screen.getByLabelText("Title")).toHaveValue("Revised title");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(vi.mocked(fetch).mock.calls[1][1]?.body).toEqual(
      vi.mocked(fetch).mock.calls[2][1]?.body,
    );
  });

  it("keeps the draft visible on conflict and reloads only on explicit activation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: "conflict", error: "stale" }), { status: 409 }),
    );
    renderEditor();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Revised title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This memory changed while you were editing.",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Revised title");
    expect(screen.getByLabelText("Title")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload Current Memory" }));
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("restores written changes and retained-photo choices after interruption", async () => {
    const firstRender = renderEditor();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Revised title" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));

    firstRender.unmount();
    renderEditor();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Revised title"));
    expect(screen.getByText("0/10")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Your saved draft was restored.");
  });

  it("submits only once while a save is pending", () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => undefined));
    renderEditor();
    const form = screen.getByRole("button", { name: "Save Changes" }).closest("form");
    if (!form) throw new Error("Edit-memory form is missing.");

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Saving changes…");
    expect(screen.getByRole("button", { name: "Saving changes…" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("aria-disabled", "true");
  });

  it("clears only the validation error for the field that changes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "validation_failed",
          error: "Please review the highlighted fields.",
          fields: { location: "Location is too long.", title: "Title is required." },
        }),
        { status: 400 },
      ),
    );
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findAllByText("Please review the highlighted fields.")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Corrected" } });

    expect(screen.getAllByText("Please review the highlighted fields.")).toHaveLength(1);
  });

  it("refreshes into the generic unavailable route state when the mutation loses access", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: "unavailable", error: "This memory is unavailable." }), {
        status: 404,
      }),
    );
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(screen.queryByText("This memory is unavailable.")).not.toBeInTheDocument();
  });

  it("shows the accessible retained-photo fallback when a signed preview expires", () => {
    renderEditor();

    fireEvent.error(screen.getByRole("img", { name: "Memory photo 1" }));

    expect(screen.getByRole("img", { name: "Photo preview unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("Saved photo")).not.toBeInTheDocument();
  });
});
