export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T; error: []; message: string }
  | { ok: false; data: null; error: ApiError[]; message: string };
