import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import "@/lib/i18n";
import { CREATE_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import { CreateSpaceInvitePage } from "./create-space-invite";
import { SpaceCreateSetupPage } from "./create-space-setup";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());

const locationMock = vi.hoisted(() => ({
  assign: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));

const createState = (
  completedSteps: string[],
  values = {
    displayName: "Leo",
    firstDay: "2023-03-26",
    spaceName: "Our Little World",
  },
) =>
  JSON.stringify({
    completedSteps,
    values,
  });

type PendingResponse = {
  json: () => Promise<Record<string, never>>;
  ok: boolean;
};

const createPendingResponse = () => {
  let resolveResponse!: (response: PendingResponse) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
  );

  return (response: PendingResponse) => resolveResponse(response);
};

const expectLoadingButton = (button: HTMLElement, label: string) => {
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toHaveTextContent(label);
  expect(button.querySelector(".animate-spin")).toBeInTheDocument();
};

describe("space setup submit feedback", () => {
  beforeEach(() => {
    navigationMock.push.mockReset();
    navigationMock.replace.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      json: async () => ({}),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    locationMock.assign.mockReset();
    vi.stubGlobal("location", locationMock);
    sessionStorage.clear();
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows loading feedback while saving the create display name", async () => {
    sessionStorage.setItem(CREATE_SPACE_STORAGE_KEY, createState([]));

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_START} />);

    const button = await screen.findByRole("button", { name: "Continue" });
    fireEvent.click(button);

    await waitFor(() => expectLoadingButton(button, "Saving your name..."));
  });

  it("shows loading feedback while saving the create space name", async () => {
    sessionStorage.setItem(CREATE_SPACE_STORAGE_KEY, createState([SPACE_SETUP_STEPS.CREATE_START]));

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_NAME} />);

    const input = await screen.findByLabelText("Space name");
    fireEvent.change(input, { target: { value: "Our Little World" } });
    const button = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(button);

    await waitFor(() => expectLoadingButton(button, "Saving your space name..."));
  });

  it("shows loading feedback while creating the space", async () => {
    const resolveCreate = createPendingResponse();
    sessionStorage.setItem(
      CREATE_SPACE_STORAGE_KEY,
      createState([SPACE_SETUP_STEPS.CREATE_START, SPACE_SETUP_STEPS.CREATE_NAME]),
    );

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />);

    const button = await screen.findByRole("button", { name: "Start Our Story" });
    fireEvent.click(button);

    await waitFor(() => expectLoadingButton(button, "Creating your space..."));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    resolveCreate({ json: async () => ({}), ok: true });
    await waitFor(() => {
      expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
    });
  });

  it("shows loading feedback while completing setup", async () => {
    const resolveSetup = createPendingResponse();

    render(<CreateSpaceInvitePage inviteCode="LNY-ABCD2" />);

    const button = await screen.findByRole("button", { name: "Continue to dashboard" });
    fireEvent.click(button);

    await waitFor(() => expectLoadingButton(button, "Completing setup..."));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    resolveSetup({ json: async () => ({}), ok: true });
    await waitFor(() => {
      expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.HOME);
    });
  });
});
