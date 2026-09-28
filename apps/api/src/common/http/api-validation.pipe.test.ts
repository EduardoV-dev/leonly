import type { ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";
import { validationErrors } from "./api-validation.pipe";

describe("validationErrors", () => {
  it("preserves constraint order and nested field paths", () => {
    const errors: ValidationError[] = [
      {
        property: "profile",
        constraints: { required: "Profile is required." },
        children: [
          {
            property: "name",
            constraints: { min: "Name is too short.", max: "Name is too long." },
          },
          { property: "email", constraints: { email: "Email is invalid." } },
        ],
      },
      { property: "age", constraints: { min: "Age is too low." } },
    ];

    expect(validationErrors(errors)).toEqual([
      { code: "VALIDATION_ERROR", field: "profile", message: "Profile is required." },
      { code: "VALIDATION_ERROR", field: "profile.name", message: "Name is too short." },
      { code: "VALIDATION_ERROR", field: "profile.name", message: "Name is too long." },
      { code: "VALIDATION_ERROR", field: "profile.email", message: "Email is invalid." },
      { code: "VALIDATION_ERROR", field: "age", message: "Age is too low." },
    ]);
  });

  it("handles deeply nested validation errors without call-stack recursion", () => {
    const root: ValidationError = { property: "root" };
    let parent = root;
    for (let depth = 0; depth < 12_000; depth++) {
      const child: ValidationError = { property: "node" };
      parent.children = [child];
      parent = child;
    }
    parent.constraints = { invalid: "Invalid value." };

    expect(validationErrors([root])).toEqual([
      {
        code: "VALIDATION_ERROR",
        field: `root${".node".repeat(12_000)}`,
        message: "Invalid value.",
      },
    ]);
  });
});
