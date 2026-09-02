import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import type { MemoryEdit } from "../../types/memory-edit";
import { EditMemoryPage } from ".";

const { pushMock, refreshMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/utils/toast", () => ({ toast: { success: toastSuccessMock } }));
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
    await i18n.changeLanguage("en");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("crypto", { randomUUID: () => "a9c28177-afb7-456e-a83d-8ef74047226f" });
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
    expect(screen.getByText("Saved photo")).toBeInTheDocument();
    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      `/memories/${memory.id}`,
    );
  });

  it("adds and removes draft photos, changes cover and placement, and submits the backend contract", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: memory.id, visibility: "vault" }), { status: 200 }),
    );
    renderEditor();
    const replacement = new File(["photo"], "replacement.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [replacement] },
    });
    expect(screen.getByText("New photo")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio", { name: /cover/i })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    fireEvent.click(screen.getByRole("radio", { name: /Private vault/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    const body = request?.body as FormData;
    expect(url).toBe(`/api/memories/${memory.id}/edit`);
    expect(request?.method).toBe("PATCH");
    expect(request?.headers).toEqual({ "Idempotency-Key": "a9c28177-afb7-456e-a83d-8ef74047226f" });
    expect(body.getAll("retainedPhotoIds")).toEqual([]);
    expect(body.get("coverPhotoIndex")).toBe("0");
    expect(body.get("expectedVersion")).toBe("opaque-version");
    expect(body.get("visibility")).toBe("vault");
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/vault/${memory.id}`));
    expect(toastSuccessMock).toHaveBeenCalledWith("Memory updated.");
  });

  it("enforces the five-photo final count without changing the creation limit", () => {
    renderEditor({
      ...memory,
      photos: Array.from({ length: 5 }, (_, index) => ({
        id: `00000000-0000-4000-8000-00000000000${index}`,
        previewUrl: `https://storage.example/${index}`,
      })),
    });

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [new File(["six"], "six.png", { type: "image/png" })] },
    });

    expect(screen.getByText("Choose up to 5 photos in the final memory.")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
  });

  it("allows removing every photo and submits no cover", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: memory.id, visibility: "timeline" }), { status: 200 }),
    );
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(screen.getByText("This memory will use its no-photo presentation.")).toBeInTheDocument();
    expect(screen.getByText("0/5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(body.getAll("retainedPhotoIds")).toEqual([]);
    expect(body.has("coverPhotoId")).toBe(false);
    expect(body.has("coverPhotoIndex")).toBe(false);
  });

  it("preserves the draft and idempotency key for a recoverable retry", async () => {
    vi.mocked(fetch)
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

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual(
      vi.mocked(fetch).mock.calls[1][1]?.headers,
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
          error: "Please review the highlighted fields.",
          fields: { location: "Location is too long.", title: "Title is required." },
        }),
        { status: 400 },
      ),
    );
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByText("Location is too long.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Corrected" } });

    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
    expect(screen.getByText("Location is too long.")).toBeInTheDocument();
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
    expect(screen.getByText("Saved photo")).toBeInTheDocument();
  });
});
