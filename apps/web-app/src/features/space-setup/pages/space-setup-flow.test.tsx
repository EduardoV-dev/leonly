import { APP_ROUTES } from "@/constants/routes";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/lib/i18n";
import { CREATE_SPACE_STORAGE_KEY, JOIN_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import { SpaceCreateSetupPage } from "./create-space-setup";
import { SpaceJoinSetupPage } from "./join-space-setup";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
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
    displayName: "",
    firstDay: "",
    spaceName: "Our Little World",
  },
) =>
  JSON.stringify({
    completedSteps,
    values,
  });

const joinState = (completedSteps: string[]) =>
  JSON.stringify({
    completedSteps,
    values: {
      displayName: "",
      inviteCode: "LNY-7KQ9M2",
    },
  });

describe("space setup flow validation and guards", () => {
  beforeEach(() => {
    navigationMock.push.mockReset();
    navigationMock.replace.mockReset();
    sessionStorage.clear();
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows create validation errors before moving forward", async () => {
    sessionStorage.setItem(
      CREATE_SPACE_STORAGE_KEY,
      createState([SPACE_SETUP_STEPS.CREATE_START], {
        displayName: "",
        firstDay: "",
        spaceName: "",
      }),
    );
    navigationMock.replace.mockReset();

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_NAME} />);

    const spaceNameInput = await screen.findByLabelText("Space name");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const error = await screen.findByText("Enter a name for your space.");
    expect(error).toBeInTheDocument();
    expect(spaceNameInput).toHaveAttribute("aria-invalid", "true");
    expect(spaceNameInput).toHaveAttribute("aria-describedby", error.id);
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it("marks a valid create step complete and pushes the next route", async () => {
    sessionStorage.setItem(CREATE_SPACE_STORAGE_KEY, createState([SPACE_SETUP_STEPS.CREATE_START]));

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_NAME} />);

    fireEvent.change(await screen.findByLabelText("Space name"), {
      target: { value: "Our Little World" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(APP_ROUTES.WELCOME_CREATE_STEP("date"));
    });

    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).toContain(
      SPACE_SETUP_STEPS.CREATE_NAME,
    );
  });

  it("blocks direct create invite access until required steps are complete", async () => {
    sessionStorage.setItem(CREATE_SPACE_STORAGE_KEY, createState([SPACE_SETUP_STEPS.CREATE_START]));

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_INVITE} />);

    await waitFor(() => {
      expect(navigationMock.replace).toHaveBeenCalledWith(APP_ROUTES.WELCOME_CREATE_STEP("name"));
    });
    expect(
      screen.queryByRole("heading", { name: "Your sanctuary is ready." }),
    ).not.toBeInTheDocument();
  });

  it("allows guarded create invite access and clears storage on finish", async () => {
    sessionStorage.setItem(
      CREATE_SPACE_STORAGE_KEY,
      createState([
        SPACE_SETUP_STEPS.CREATE_START,
        SPACE_SETUP_STEPS.CREATE_NAME,
        SPACE_SETUP_STEPS.CREATE_DATE,
      ]),
    );

    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_INVITE} />);

    expect(
      await screen.findByRole("heading", { name: "Your space is ready." }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Our Story" }));

    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).toBeNull();
    expect(navigationMock.push).toHaveBeenCalledWith(APP_ROUTES.HOME);
  });

  it("validates join code before moving to display name", async () => {
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);

    const inviteCodeInput = await screen.findByLabelText("Invite code");
    fireEvent.click(screen.getByRole("button", { name: /join space/i }));

    const error = await screen.findByText("Enter an invite code.");
    expect(error).toBeInTheDocument();
    expect(inviteCodeInput).toHaveAttribute("aria-invalid", "true");
    expect(inviteCodeInput).toHaveAttribute("aria-describedby", error.id);
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it("keeps the invalid join code field focused while showing its error", async () => {
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);

    const inviteCodeInput = await screen.findByLabelText("Invite code");
    fireEvent.click(screen.getByRole("button", { name: /join space/i }));

    await screen.findByText("Enter an invite code.");

    await waitFor(() => {
      expect(inviteCodeInput).toHaveFocus();
    });
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("shows invalid join code format errors", async () => {
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);

    const inviteCodeInput = await screen.findByLabelText("Invite code");
    fireEvent.change(inviteCodeInput, {
      target: { value: "bad-code" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join space/i }));

    const error = await screen.findByText("Use a code like LNY-7KQ9M2.");
    expect(error).toBeInTheDocument();
    expect(inviteCodeInput).toHaveAttribute("aria-invalid", "true");
    expect(inviteCodeInput).toHaveAttribute("aria-describedby", error.id);
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it("marks a valid join code complete and pushes the next route", async () => {
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);

    fireEvent.change(await screen.findByLabelText("Invite code"), {
      target: { value: "lny-7kq9m2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join space/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(APP_ROUTES.WELCOME_JOIN_STEP("name"));
    });

    expect(sessionStorage.getItem(JOIN_SPACE_STORAGE_KEY)).toContain(SPACE_SETUP_STEPS.JOIN_CODE);
  });

  it("blocks direct join name access until code is complete", async () => {
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_NAME} />);

    await waitFor(() => {
      expect(navigationMock.replace).toHaveBeenCalledWith(APP_ROUTES.WELCOME_JOIN_STEP("code"));
    });
    expect(
      screen.queryByRole("heading", { name: "Add your display name" }),
    ).not.toBeInTheDocument();
  });

  it("allows guarded join name access and clears storage on finish", async () => {
    sessionStorage.setItem(JOIN_SPACE_STORAGE_KEY, joinState([SPACE_SETUP_STEPS.JOIN_CODE]));

    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_NAME} />);

    expect(
      await screen.findByRole("heading", { name: "Add your display name" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Our Story" }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(APP_ROUTES.HOME);
    });
    expect(sessionStorage.getItem(JOIN_SPACE_STORAGE_KEY)).toBeNull();
  });

  it("shows join display name validation errors before finishing", async () => {
    sessionStorage.setItem(JOIN_SPACE_STORAGE_KEY, joinState([SPACE_SETUP_STEPS.JOIN_CODE]));

    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_NAME} />);

    const displayNameInput = await screen.findByLabelText(/Your display name/);
    fireEvent.change(displayNameInput, {
      target: { value: "Leo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Our Story" }));

    const error = await screen.findByText("Use at least 5 characters.");
    expect(error).toBeInTheDocument();
    expect(displayNameInput).toHaveAttribute("aria-invalid", "true");
    expect(displayNameInput).toHaveAttribute("aria-describedby", error.id);
    expect(sessionStorage.getItem(JOIN_SPACE_STORAGE_KEY)).not.toBeNull();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
