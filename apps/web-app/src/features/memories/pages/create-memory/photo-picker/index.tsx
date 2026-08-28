import { Check, ImagePlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldError } from "@/components/ui/field";
import {
  ACCEPTED_MEMORY_PHOTO_EXTENSIONS,
  MAX_MEMORY_PHOTO_COUNT,
  MAX_MEMORY_PHOTO_SIZE_BYTES,
} from "../../../constants/create-memory";
import type { SelectedMemoryPhoto } from "../use-create-memory-form";
import styles from "./photo-picker.module.css";

const photoInputAccept = ACCEPTED_MEMORY_PHOTO_EXTENSIONS.map((extension) => `.${extension}`).join(
  ",",
);

type PhotoPickerProps = {
  coverPhotoIndex: number | null;
  error?: string;
  onAdd: (photos: File[]) => void;
  onRemove: (index: number) => void;
  onSelectCover: (index: number) => void;
  photos: SelectedMemoryPhoto[];
};

export function PhotoPicker({
  coverPhotoIndex,
  error,
  onAdd,
  onRemove,
  onSelectCover,
  photos,
}: Readonly<PhotoPickerProps>) {
  const { t } = useTranslation("memories");
  const maxPhotoSizeMb = MAX_MEMORY_PHOTO_SIZE_BYTES / 1024 / 1024;

  return (
    <section className={styles.section} aria-labelledby="memory-photos-heading">
      <div className={styles.heading}>
        <h2 id="memory-photos-heading">{t("create.photos.heading")}</h2>
        <span>
          {t("create.photos.count", { count: photos.length, max: MAX_MEMORY_PHOTO_COUNT })}
        </span>
      </div>
      <label
        className={styles.upload}
        htmlFor="memory-photos"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onAdd(Array.from(event.dataTransfer.files));
        }}
      >
        <span className={styles.uploadIcon}>
          <ImagePlus aria-hidden="true" />
        </span>
        <strong>{t("create.photos.uploadPrompt")}</strong>
        <small>
          {t("create.photos.uploadHelp", {
            count: MAX_MEMORY_PHOTO_COUNT,
            size: maxPhotoSizeMb,
          })}
        </small>
        <input
          id="memory-photos"
          accept={photoInputAccept}
          aria-describedby={error ? "memory-photos-error" : undefined}
          aria-invalid={Boolean(error)}
          multiple
          type="file"
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>

      {photos.length > 0 ? (
        <fieldset className={styles.choices}>
          <legend>{t("create.photos.coverLegend")}</legend>
          <div className={styles.grid}>
            {photos.map((photo, index) => {
              const isCover = coverPhotoIndex === index;

              return (
                <div className={styles.card} data-cover={isCover} key={photo.previewUrl}>
                  {/* biome-ignore lint/performance/noImgElement: Local object URLs need no optimization. */}
                  <img src={photo.previewUrl} alt="" />
                  <label className={styles.coverChoice}>
                    <input
                      checked={isCover}
                      name="cover-photo"
                      type="radio"
                      onChange={() => onSelectCover(index)}
                    />
                    <span>
                      {isCover ? <Check aria-hidden="true" /> : null}
                      {isCover ? t("create.photos.cover") : t("create.photos.makeCover")}
                    </span>
                  </label>
                  <button
                    className={styles.remove}
                    type="button"
                    aria-label={t("create.photos.remove", { name: photo.file.name })}
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <FieldError id="memory-photos-error">{error}</FieldError>
    </section>
  );
}
