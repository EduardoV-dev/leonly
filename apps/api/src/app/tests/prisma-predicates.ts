import { type File } from "@leonly/database/client";

export const SPACE_ID = "01900000-0000-7000-8000-000000000005";
export const MEMBER_ID = "01900000-0000-7000-8000-000000000006";

type MatchesUploadParams = { upload: File; where: Record<string, unknown> };

export function matchesUpload({ upload, where }: MatchesUploadParams): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === "OR" && Array.isArray(expected)) {
      return expected.some((condition) => matchesUpload({ upload, where: condition }));
    }
    const actual = upload[field as keyof File];
    if (typeof expected === "object" && expected !== null && !(expected instanceof Date)) {
      if ("in" in expected && Array.isArray(expected.in)) return expected.in.includes(actual);
      if ("not" in expected) return actual !== (expected as { not: unknown }).not;
      if ("gt" in expected) return actual instanceof Date && actual > (expected.gt as Date);
      if ("lte" in expected) return actual instanceof Date && actual <= (expected.lte as Date);
    }
    return actual === expected;
  });
}
