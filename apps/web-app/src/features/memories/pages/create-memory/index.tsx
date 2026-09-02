"use client";

import { APP_ROUTES } from "@/constants/routes";
import { MemoryEditorForm } from "../../components/memory-editor-form";
import { MAX_MEMORY_PHOTO_COUNT } from "../../constants/create-memory";
import { useCreateMemoryForm } from "./use-create-memory-form";

export function CreateMemoryPage() {
  const form = useCreateMemoryForm();

  return (
    <MemoryEditorForm
      {...form}
      backHref={APP_ROUTES.TIMELINE}
      maxPhotos={MAX_MEMORY_PHOTO_COUNT}
      mode="create"
      onAddPhotos={form.addPhotos}
      onRemovePhoto={form.removePhoto}
      onSelectCover={form.selectCoverPhoto}
      onSubmit={form.submit}
      onUpdateValue={form.updateValue}
    />
  );
}
