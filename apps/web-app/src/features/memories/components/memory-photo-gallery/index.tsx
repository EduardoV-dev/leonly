"use client";

import { ChevronLeft, ChevronRight, Heart, ImageIcon, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHorizontalSwipe } from "../../hooks/use-horizontal-swipe";
import type { MemoryDetailPhoto } from "../../types/memory-detail";
import { MemoryPhotoLightbox } from "../memory-photo-lightbox";
import styles from "./memory-photo-gallery.module.css";
import ambientStyles from "./memory-photo-gallery-ambient.module.css";

type MemoryPhotoGalleryProps = {
  dateLabel: string;
  dateTime: string;
  description: string | null;
  photos: MemoryDetailPhoto[];
  title: string;
};

export function MemoryPhotoGallery({
  dateLabel,
  dateTime,
  description,
  photos,
  title,
}: Readonly<MemoryPhotoGalleryProps>) {
  const { t } = useTranslation("memories");
  const [failedCoverPhotoIds, setFailedCoverPhotoIds] = useState<Set<string>>(() => new Set());
  const [failedDetailPhotoIds, setFailedDetailPhotoIds] = useState<Set<string>>(() => new Set());
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const photoCount = photos.length;
  const selectedPhoto = photos[selectedIndex];
  const selectedDetailUrl =
    selectedPhoto && !failedDetailPhotoIds.has(selectedPhoto.id) ? selectedPhoto.detailUrl : null;
  const selectedCoverUrl =
    selectedPhoto && !failedCoverPhotoIds.has(selectedPhoto.id) ? selectedPhoto.coverUrl : null;
  const selectedUrl = selectedDetailUrl ?? selectedCoverUrl;
  const selectedPosition = selectedIndex + 1;

  useEffect(() => {
    thumbnailRefs.current[selectedIndex]?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedIndex]);

  const selectPrevious = () => {
    setSelectedIndex((current) => (current - 1 + photoCount) % photoCount);
  };
  const selectNext = () => {
    setSelectedIndex((current) => (current + 1) % photoCount);
  };
  const swipeHandlers = useHorizontalSwipe({
    isEnabled: photoCount > 1,
    onSwipeLeft: selectNext,
    onSwipeRight: selectPrevious,
  });

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

  const markSelectedPhotoFailed = () => {
    const setFailedPhotoIds = selectedDetailUrl ? setFailedDetailPhotoIds : setFailedCoverPhotoIds;
    setFailedPhotoIds((current) => new Set(current).add(selectedPhoto.id));
  };
  const markPhotoFailed = (photoId: string) => {
    setFailedCoverPhotoIds((current) => new Set(current).add(photoId));
  };

  return (
    <section className={styles.gallery} aria-label={t("detail.gallery.label", { title })}>
      <div className={styles.stage}>
        <div className={ambientStyles.ambient} aria-hidden="true">
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
          <Heart />
          <Star />
        </div>
        {selectedUrl ? (
          <button
            type="button"
            className={styles.photoTrigger}
            onClick={() => setIsLightboxOpen(true)}
            aria-label={t("detail.lightbox.open", { position: selectedPosition })}
            {...swipeHandlers}
          >
            {/* biome-ignore lint/performance/noImgElement: The browser must request the reauthorizing route directly. */}
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
          </button>
        ) : (
          <div
            className={styles.photoFallback}
            role="img"
            aria-label={t("detail.gallery.photoUnavailable", { position: selectedPosition })}
            {...swipeHandlers}
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

      {isLightboxOpen ? (
        <MemoryPhotoLightbox
          dateLabel={dateLabel}
          dateTime={dateTime}
          description={description}
          onClose={() => setIsLightboxOpen(false)}
          onNext={selectNext}
          onPhotoError={markSelectedPhotoFailed}
          onPrevious={selectPrevious}
          onSelect={setSelectedIndex}
          photoIds={photos.map((photo) => photo.id)}
          photoUrl={selectedUrl}
          selectedIndex={selectedIndex}
          title={title}
        />
      ) : null}

      {photoCount > 1 ? (
        <fieldset className={styles.thumbnails}>
          <legend className={styles.srOnly}>{t("detail.gallery.label", { title })}</legend>
          {photos.map((photo, index) => {
            const thumbnailUrl = failedCoverPhotoIds.has(photo.id)
              ? null
              : (photo.coverUrl ?? photo.detailUrl);
            const position = index + 1;

            return (
              <button
                key={photo.id}
                type="button"
                aria-pressed={index === selectedIndex}
                aria-label={t("detail.gallery.selectPhoto", { position, total: photoCount })}
                className={styles.thumbnail}
                onClick={() => setSelectedIndex(index)}
                ref={(element) => {
                  thumbnailRefs.current[index] = element;
                }}
              >
                {thumbnailUrl ? (
                  // biome-ignore lint/performance/noImgElement: The browser must request the reauthorizing route directly.
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
