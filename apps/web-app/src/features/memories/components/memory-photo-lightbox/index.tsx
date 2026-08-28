"use client";

import { ChevronLeft, ChevronRight, ImageIcon, Info, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHorizontalSwipe } from "../../hooks/use-horizontal-swipe";
import styles from "./memory-photo-lightbox.module.css";

type MemoryPhotoLightboxProps = {
  dateLabel: string;
  dateTime: string;
  description: string | null;
  onClose: () => void;
  onNext: () => void;
  onPhotoError: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
  photoIds: readonly string[];
  photoUrl: string | null;
  selectedIndex: number;
  title: string;
};

export function MemoryPhotoLightbox({
  dateLabel,
  dateTime,
  description,
  onClose,
  onNext,
  onPhotoError,
  onPrevious,
  onSelect,
  photoIds,
  photoUrl,
  selectedIndex,
  title,
}: Readonly<MemoryPhotoLightboxProps>) {
  const { t } = useTranslation("memories");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [areDetailsVisible, setAreDetailsVisible] = useState(false);
  const photoCount = photoIds.length;
  const selectedPosition = selectedIndex + 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const closeLightbox = () => {
    dialogRef.current?.close();
  };
  const handleClose = () => {
    setAreDetailsVisible(false);
    onClose();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
    }
  };
  const toggleDetails = () => {
    setAreDetailsVisible((current) => !current);
  };
  const swipeHandlers = useHorizontalSwipe({
    isEnabled: photoCount > 1,
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  });

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={t("detail.lightbox.label", { title })}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.shell} data-details-visible={areDetailsVisible || undefined}>
        <output className={styles.counter} aria-live="polite">
          {t("detail.lightbox.position", { position: selectedPosition, total: photoCount })}
        </output>

        <button
          type="button"
          className={styles.close}
          onClick={closeLightbox}
          aria-label={t("detail.lightbox.close")}
        >
          <X aria-hidden="true" />
        </button>

        <div className={styles.media}>
          {photoUrl ? (
            <button
              type="button"
              className={styles.photoToggle}
              aria-controls="memory-lightbox-details"
              aria-expanded={areDetailsVisible}
              aria-label={t(
                areDetailsVisible ? "detail.lightbox.hideDetails" : "detail.lightbox.showDetails",
              )}
              onClick={toggleDetails}
              {...swipeHandlers}
            >
              {/* biome-ignore lint/performance/noImgElement: Private signed URLs are resolved at request time. */}
              <img
                key={selectedIndex}
                src={photoUrl}
                width={1600}
                height={1600}
                alt={t("detail.gallery.photoAlt", {
                  position: selectedPosition,
                  title,
                  total: photoCount,
                })}
                onError={onPhotoError}
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

          {photoCount > 1 ? (
            <div className={styles.navigation}>
              <button
                type="button"
                onClick={onPrevious}
                aria-label={t("detail.actions.previousPhoto")}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" onClick={onNext} aria-label={t("detail.actions.nextPhoto")}>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {areDetailsVisible ? (
          <section className={styles.details} id="memory-lightbox-details" aria-live="polite">
            <time dateTime={dateTime}>{dateLabel}</time>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </section>
        ) : null}

        {photoCount > 1 ? (
          <fieldset className={styles.pagination}>
            <legend className={styles.srOnly}>{t("detail.lightbox.pagination")}</legend>
            {photoIds.map((photoId, index) => (
              <button
                key={photoId}
                type="button"
                aria-label={t("detail.gallery.selectPhoto", {
                  position: index + 1,
                  total: photoCount,
                })}
                aria-pressed={index === selectedIndex}
                onClick={() => onSelect(index)}
              />
            ))}
          </fieldset>
        ) : null}

        <button
          type="button"
          className={styles.info}
          aria-controls="memory-lightbox-details"
          aria-expanded={areDetailsVisible}
          aria-label={t(
            areDetailsVisible ? "detail.lightbox.hideDetails" : "detail.lightbox.showDetails",
          )}
          onClick={() => setAreDetailsVisible((current) => !current)}
        >
          <Info aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}
