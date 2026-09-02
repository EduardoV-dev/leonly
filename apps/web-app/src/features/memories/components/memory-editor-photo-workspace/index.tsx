import { Check, ImageOff, ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldError } from "@/components/ui/field";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../../constants/create-memory";
import type { MemoryEditorPhoto } from "../../types/memory-editor";
import styles from "./memory-editor-photo-workspace.module.css";

const photoInputAccept = ACCEPTED_MEMORY_PHOTO_EXTENSIONS.map((extension) => `.${extension}`).join(
  ",",
);

type MemoryEditorPhotoWorkspaceProps = {
  coverPhotoKey: string | null;
  error?: string;
  isDisabled: boolean;
  maxPhotos: number;
  mode: "create" | "edit";
  onAdd: (photos: File[]) => void;
  onRemove: (key: string) => void;
  onSelectCover: (key: string) => void;
  photos: MemoryEditorPhoto[];
};

export function MemoryEditorPhotoWorkspace({
  coverPhotoKey,
  error,
  isDisabled,
  maxPhotos,
  mode,
  onAdd,
  onRemove,
  onSelectCover,
  photos,
}: Readonly<MemoryEditorPhotoWorkspaceProps>) {
  const { t } = useTranslation("memories");
  const maxPhotoSizeMb = MAX_MEMORY_PHOTO_SIZE_BYTES / 1024 / 1024;
  const [unavailablePreviewUrls, setUnavailablePreviewUrls] = useState<ReadonlySet<string>>(
    new Set(),
  );

  return (
    <section className={styles.section} aria-labelledby="memory-photos-heading">
      <div className={styles.heading}>
        <h2 id="memory-photos-heading">{t("create.photos.heading")}</h2>
        <span>{t("create.photos.count", { count: photos.length, max: maxPhotos })}</span>
      </div>
      <label
        className={styles.upload}
        data-disabled={isDisabled}
        htmlFor="memory-photos"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!isDisabled) {
            onAdd(Array.from(event.dataTransfer.files));
          }
        }}
      >
        <span className={styles.uploadIcon}>
          <ImagePlus aria-hidden="true" />
        </span>
        <strong>{t("create.photos.uploadPrompt")}</strong>
        <small>{t("create.photos.uploadHelp", { count: maxPhotos, size: maxPhotoSizeMb })}</small>
        <input
          id="memory-photos"
          accept={photoInputAccept}
          aria-describedby={error ? "memory-photos-error" : undefined}
          aria-invalid={Boolean(error)}
          disabled={isDisabled}
          multiple
          name="photos"
          type="file"
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>

      {photos.length > 0 ? (
        <fieldset className={styles.choices} disabled={isDisabled}>
          <legend>{t("create.photos.coverLegend")}</legend>
          <div className={styles.grid}>
            {photos.map((photo, index) => {
              const isCover = coverPhotoKey === photo.key;
              const previewUrl = photo.previewUrl;
              const hasPreview = previewUrl && !unavailablePreviewUrls.has(previewUrl);
              return (
                <div className={styles.card} data-cover={isCover} key={photo.key}>
                  {hasPreview ? (
                    // biome-ignore lint/performance/noImgElement: Authorized and local runtime URLs cannot use next/image.
                    <img
                      src={previewUrl}
                      alt={t("edit.photos.previewAlt", { position: index + 1 })}
                      height={480}
                      width={640}
                      onError={() => {
                        setUnavailablePreviewUrls((current) => new Set(current).add(previewUrl));
                      }}
                    />
                  ) : (
                    <span
                      className={styles.unavailable}
                      role="img"
                      aria-label={t("edit.photos.unavailable")}
                    >
                      <ImageOff aria-hidden="true" />
                    </span>
                  )}
                  {mode === "edit" ? (
                    <span className={styles.badge}>
                      {t(photo.kind === "retained" ? "edit.photos.saved" : "edit.photos.new")}
                    </span>
                  ) : null}
                  <label className={styles.coverChoice}>
                    <input
                      checked={isCover}
                      name="cover-photo"
                      type="radio"
                      onChange={() => onSelectCover(photo.key)}
                    />
                    <span>
                      {isCover ? <Check aria-hidden="true" /> : null}
                      {isCover ? t("create.photos.cover") : t("create.photos.makeCover")}
                    </span>
                  </label>
                  <button
                    className={styles.remove}
                    type="button"
                    aria-label={t("create.photos.remove", { name: photo.name })}
                    onClick={() => onRemove(photo.key)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : mode === "edit" ? (
        <p className={styles.empty}>{t("edit.photos.empty")}</p>
      ) : null}
      <FieldError id="memory-photos-error">{error}</FieldError>
    </section>
  );
}
