type ApiError = { code: string; message: string; field?: string };

export type JoinApiResponse<T> =
  | { ok: true; data: T | null; error: []; message: string }
  | { ok: false; data: null; error: ApiError[]; message: string };
