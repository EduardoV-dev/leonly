import "server-only";

import {
  type ApiResponse,
  type MemoryEditorSnapshot,
  memoryEditorSnapshotSchema,
} from "@leonly/utils/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { APP_ROUTES } from "@/constants/routes";
import { isAxiosError, serverApi } from "@/lib/axios/server-api";
import type { MemoryEdit } from "../types/memory-edit";

const memoryIdSchema = z.uuid();

type EditorSnapshotResponse = Awaited<ReturnType<typeof requestEditorSnapshot>>;

async function requestEditorSnapshot(memoryId: string, cookie: string) {
  return serverApi.get<ApiResponse<MemoryEditorSnapshot>>(
    `/memories/${encodeURIComponent(memoryId)}/edit`,
    { headers: { cookie }, validateStatus: () => true },
  );
}

export const getMemoryForEditing = cache(async function getMemoryForEditing(
  memoryId: string,
): Promise<MemoryEdit | null> {
  if (!memoryIdSchema.safeParse(memoryId).success) {
    return null;
  }

  const requestHeaders = await headers();
  let response: EditorSnapshotResponse;

  try {
    response = await requestEditorSnapshot(memoryId, requestHeaders.get("cookie") ?? "");
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) redirect(APP_ROUTES.AUTH);
    throw new Error("Failed to load memory editor.", { cause: error });
  }

  if (response.status === 404) return null;
  if (response.status === 401) redirect(APP_ROUTES.AUTH);
  if (!response.data.ok) throw new Error("Failed to load memory editor.");

  const parsed = memoryEditorSnapshotSchema.safeParse(response.data.data);
  if (!parsed.success) throw new Error("Failed to load memory editor.", { cause: parsed.error });

  const snapshot = parsed.data;
  return {
    coverPhotoId: snapshot.coverFileId,
    description: snapshot.description,
    id: snapshot.id,
    initialVisibility: snapshot.visibility,
    location: snapshot.location,
    memoryDate: snapshot.memoryDate,
    photos: snapshot.photos,
    title: snapshot.title,
    version: snapshot.updatedAt,
  };
});
