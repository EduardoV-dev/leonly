"use client";

import { MemoryEditorForm } from "../../components/memory-editor-form";
import { MAX_EDIT_MEMORY_PHOTO_COUNT } from "../../constants/edit-memory";
import type { MemoryEdit } from "../../types/memory-edit";
import { useEditMemoryForm } from "./use-edit-memory-form";

type EditMemoryPageProps = { memory: MemoryEdit };

export function EditMemoryPage({ memory }: Readonly<EditMemoryPageProps>) {
  const form = useEditMemoryForm(memory);

  const backHref =
    memory.initialVisibility === "vault" ? `/vault/${memory.id}` : `/memories/${memory.id}`;

  return (
    <MemoryEditorForm
      {...form}
      backHref={backHref}
      maxPhotos={MAX_EDIT_MEMORY_PHOTO_COUNT}
      mode="edit"
      onAddPhotos={form.addPhotos}
      onReload={form.reload}
      onRemovePhoto={form.removePhoto}
      onSelectCover={form.selectCoverPhoto}
      onSubmit={form.submit}
      onUpdateValue={form.updateValue}
    />
  );
}
