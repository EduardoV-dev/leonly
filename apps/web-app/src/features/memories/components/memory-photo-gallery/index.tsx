"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MemoryDetailPhoto } from "../../types/memory-detail";
import styles from "./memory-photo-gallery.module.css";

type MemoryPhotoGalleryProps = {
  photos: MemoryDetailPhoto[];
  title: string;
};

export function MemoryPhotoGallery({ photos, title }: Readonly<MemoryPhotoGalleryProps>) {
  const { t } = useTranslation("memories");
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(() => new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const photoCount = photos.length;
  const selectedPhoto = photos[selectedIndex];
  const selectedUrl =
    selectedPhoto && !failedPhotoIds.has(selectedPhoto.id) ? selectedPhoto.url : null;
  const selectedPosition = selectedIndex + 1;

  if (!selectedPhoto) {
    return (
      <section className={styles.empty} aria-label={t("detail.gallery.label", { title })}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <ImageIcon />
        </span>
        <p className={styles.emptyTitle}>{t("detail.gallery.noPhotoTitle")}</p>
        <p>{t("detail.gallery.noPhotoDescription")}</p>
      </section>
    );
  }

  const selectPrevious = () => {
    setSelectedIndex((current) => (current - 1 + photoCount) % photoCount);
  };
  const selectNext = () => {
    setSelectedIndex((current) => (current + 1) % photoCount);
  };
  const markSelectedPhotoFailed = () => {
    setFailedPhotoIds((current) => new Set(current).add(selectedPhoto.id));
  };
  const markPhotoFailed = (photoId: string) => {
    setFailedPhotoIds((current) => new Set(current).add(photoId));
  };

  return (
    <section className={styles.gallery} aria-label={t("detail.gallery.label", { title })}>
      <div className={styles.stage}>
        {selectedUrl ? (
          // biome-ignore lint/performance/noImgElement: Private signed URLs are resolved at request time.
          <img
            key={selectedPhoto.id}
            src={selectedUrl}
            width={1200}
            height={1500}
            alt={t("detail.gallery.photoAlt", {
              position: selectedPosition,
              title,
              total: photoCount,
            })}
            fetchPriority={selectedIndex === 0 ? "high" : "auto"}
            onError={markSelectedPhotoFailed}
          />
        ) : (
          <div
            className={styles.photoFallback}
            role="img"
            aria-label={t("detail.gallery.photoUnavailable", { position: selectedPosition })}
          >
            <ImageIcon aria-hidden="true" />
          </div>
        )}

        <output className={styles.position} aria-live="polite">
          {t("detail.gallery.position", { position: selectedPosition, total: photoCount })}
        </output>

        {photoCount > 1 ? (
          <div className={styles.navigation}>
            <button
              type="button"
              onClick={selectPrevious}
              aria-label={t("detail.actions.previousPhoto")}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={selectNext} aria-label={t("detail.actions.nextPhoto")}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {photoCount > 1 ? (
        <fieldset className={styles.thumbnails}>
          <legend className={styles.srOnly}>{t("detail.gallery.label", { title })}</legend>
          {photos.map((photo, index) => {
            const thumbnailUrl = failedPhotoIds.has(photo.id) ? null : photo.url;
            const position = index + 1;

            return (
              <button
                key={photo.id}
                type="button"
                aria-pressed={index === selectedIndex}
                aria-label={t("detail.gallery.selectPhoto", { position, total: photoCount })}
                className={styles.thumbnail}
                onClick={() => setSelectedIndex(index)}
              >
                {thumbnailUrl ? (
                  // biome-ignore lint/performance/noImgElement: Private signed URLs are resolved at request time.
                  <img
                    src={thumbnailUrl}
                    alt=""
                    width={160}
                    height={120}
                    loading="lazy"
                    onError={() => markPhotoFailed(photo.id)}
                  />
                ) : (
                  <ImageIcon aria-hidden="true" />
                )}
                <span>{position}</span>
              </button>
            );
          })}
        </fieldset>
      ) : null}
    </section>
  );
}
