import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import type { MemoryEdit } from "../../types/memory-edit";
import { EditMemoryPage } from ".";

const {
  apiPatchMock,
  apiPostMock,
  pushMock,
  refreshMock,
  revalidateMock,
  replaceMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  revalidateMock: vi.fn(),
  replaceMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: replaceMock }),
}));
vi.mock("@/utils/toast", () => ({ toast: { success: toastSuccessMock, error: toastErrorMock } }));
vi.mock("@/lib/axios/api", () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
    patch: (...args: unknown[]) => apiPatchMock(...args),
  },
}));
vi.mock("../../server/revalidate-placement-views", () => ({
  revalidatePlacementViews: revalidateMock,
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

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const photoId = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const updatedAt = "2026-09-05T16:00:00.123000Z";

const memory: MemoryEdit = {
  coverPhotoId: photoId,
  description: "A quiet afternoon together.",
  id: memoryId,
  initialVisibility: "timeline",
  location: "The botanical gardens",
  memoryDate: "2026-08-20",
  photos: [
    {
      id: photoId,
      previewUrl: "https://storage.example/photo",
    },
  ],
  title: "Among the flowers",
  version: updatedAt,
};

function issuanceResponse() {
  return {
    data: {
      ok: true,
      data: {
        uploads: [
          {
            id: "01900000-0000-7000-8000-0000000000aa",
            putUrl: "https://storage.example/signed-put",
            requiredHeaders: { "Content-Type": "image/png", "If-None-Match": "*" },
            expiresAt: "2026-10-11T00:10:00.000Z",
          },
        ],
      },
      error: [],
      message: "ok",
    },
  };
}

function committedResponse(visibility: "timeline" | "vault" = "timeline") {
  return {
    status: 200,
    data: {
      ok: true,
      data: { id: memoryId, visibility, updatedAt: "2026-10-11T00:00:00.000000Z" },
      error: [],
      message: "ok",
    },
  };
}

function failureResponse(status: number) {
  return {
    status,
    data: {
      ok: false,
      data: null,
      error: [{ code: `HTTP_${status}`, message: "failed" }],
      message: "failed",
    },
  };
}

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
    expect(screen.getByText("1/10")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      `/memories/${memoryId}`,
    );
  });

  it("stages additions with immutable PUT and submits the strict save contract", async () => {
    apiPostMock.mockResolvedValue(issuanceResponse());
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    apiPatchMock.mockResolvedValue(committedResponse("vault"));
    renderEditor();
    const replacement = new File(["photo"], "replacement.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [replacement] },
    });
    fireEvent.click(screen.getAllByRole("radio", { name: /cover/i })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    fireEvent.click(screen.getByRole("radio", { name: /Private vault/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenCalledWith(
      "/files/uploads",
      {
        purpose: "memory_image",
        files: [{ filename: "replacement.png", contentType: "image/png", byteSize: 5 }],
      },
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
    const [putUrl, putRequest] = vi.mocked(fetch).mock.calls[0];
    expect(putUrl).toBe("https://storage.example/signed-put");
    expect(putRequest?.method).toBe("PUT");
    expect(putRequest?.headers).toEqual({
      "Content-Type": "image/png",
      "If-None-Match": "*",
    });
    const [, patchRequest] = apiPatchMock.mock.calls[0];
    expect(patchRequest).toMatchObject({
      title: "Among the flowers",
      description: "A quiet afternoon together.",
      location: "The botanical gardens",
      memoryDate: "2026-08-20",
      visibility: "vault",
      lastKnownUpdatedAt: updatedAt,
      retainedPhotoIds: [],
      uploadIds: ["01900000-0000-7000-8000-0000000000aa"],
      coverFileId: "01900000-0000-7000-8000-0000000000aa",
    });
    expect(patchRequest).not.toHaveProperty("idempotencyKey");
    expect(patchRequest).not.toHaveProperty("mutationId");

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/vault/${memoryId}`));
    expect(toastSuccessMock).toHaveBeenCalledWith("Memory updated.");
    expect(revalidateMock).toHaveBeenCalledWith({ memoryId, visibility: "vault" });
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

  it("submits a null cover for remove-all edits", async () => {
    apiPatchMock.mockResolvedValue(committedResponse());
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    expect(screen.getByText("This memory will use its no-photo presentation.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).not.toHaveBeenCalled();
    const [, patchRequest] = apiPatchMock.mock.calls[0];
    expect(patchRequest).toMatchObject({
      retainedPhotoIds: [],
      uploadIds: [],
      coverFileId: null,
    });
  });

  it("retries a definite failure with the same timestamp and staged upload identities", async () => {
    apiPostMock.mockResolvedValue(issuanceResponse());
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    apiPatchMock
      .mockResolvedValueOnce(failureResponse(500))
      .mockResolvedValueOnce(committedResponse());
    renderEditor();
    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: [new File(["photo"], "replacement.png", { type: "image/png" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock).toHaveBeenCalledTimes(1);
    expect(apiPatchMock.mock.calls[0][1]).toEqual(apiPatchMock.mock.calls[1][1]);
  });

  it("keeps the draft visible on conflict and reloads only on explicit activation", async () => {
    apiPatchMock.mockResolvedValue(failureResponse(409));
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

  it("offers reload without blind replay after an uncertain response", async () => {
    apiPostMock.mockResolvedValue(issuanceResponse());
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    apiPatchMock.mockRejectedValue(new Error("network lost"));
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not confirm your last save.",
    );
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(apiPatchMock).toHaveBeenCalledTimes(1);
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

  it("submits only once while a save is pending", async () => {
    apiPatchMock.mockReturnValue(new Promise(() => undefined));
    renderEditor();
    const form = screen.getByRole("button", { name: "Save Changes" }).closest("form");
    if (!form) throw new Error("Edit-memory form is missing.");

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("Saving changes…");
    expect(screen.getByRole("button", { name: "Saving changes…" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("aria-disabled", "true");
  });

  it("clears only the validation error for the field that changes", async () => {
    apiPatchMock.mockResolvedValue({
      status: 400,
      data: {
        ok: false,
        data: null,
        error: [
          { code: "VALIDATION_ERROR", message: "Too long.", field: "location" },
          { code: "VALIDATION_ERROR", message: "Required.", field: "title" },
        ],
        message: "failed",
      },
    });
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findAllByText("Please review the highlighted fields.")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Corrected" } });

    expect(screen.getAllByText("Please review the highlighted fields.")).toHaveLength(1);
  });

  it("refreshes into the generic unavailable route state when the save loses access", async () => {
    apiPatchMock.mockResolvedValue(failureResponse(404));
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });

  it("shows the accessible retained-photo fallback when a signed preview expires", () => {
    renderEditor();

    fireEvent.error(screen.getByRole("img", { name: "Memory photo 1" }));

    expect(screen.getByRole("img", { name: "Photo preview unavailable" })).toBeInTheDocument();
  });
});
