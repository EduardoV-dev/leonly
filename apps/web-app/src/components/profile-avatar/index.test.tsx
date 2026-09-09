import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileAvatar } from ".";

describe("ProfileAvatar", () => {
  it("renders initials when the profile image fails to load", () => {
    render(
      <ProfileAvatar
        avatarUrl="https://example.com/avatar.jpg"
        className="avatar"
        displayName="Leo Nardo"
        fallbackClassName="fallback"
        height={52}
        label="Leo Nardo's avatar"
        width={52}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Leo Nardo's avatar" }));

    expect(screen.getByRole("img", { name: "Leo Nardo's avatar" })).toHaveTextContent("LN");
  });
});
