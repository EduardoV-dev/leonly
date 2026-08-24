"use client";

import { ArrowLeft, LockKeyhole, MapPin, Save, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { PastDatePicker } from "@/components/past-date-picker";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { APP_ROUTES } from "@/constants/routes";
import styles from "./create-memory.module.css";
import { PhotoPicker } from "./photo-picker";
import { useCreateMemoryForm } from "./use-create-memory-form";

export function CreateMemoryPage() {
  const { t } = useTranslation("memories");
  const form = useCreateMemoryForm();

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={APP_ROUTES.TIMELINE}>
        <ArrowLeft aria-hidden="true" />
        {t("create.backToTimeline")}
      </Link>
      <header className={styles.intro}>
        <h1 id="create-memory-title">{t("create.heading")}</h1>
        <p>{t("create.intro")}</p>
      </header>

      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <label className={`${styles.field} ${styles.titleField}`} htmlFor="memory-title">
          <span className={styles.fieldHeading}>
            <strong>{t("create.fields.title.label")}</strong>
            <small>{form.values.title.length}/120</small>
          </span>
          <input
            id="memory-title"
            aria-label={t("create.fields.title.label")}
            value={form.values.title}
            onChange={(event) => form.updateValue("title", event.target.value)}
            aria-describedby={form.fields.title ? "memory-title-error" : undefined}
            aria-invalid={Boolean(form.fields.title)}
            aria-required="true"
            maxLength={120}
            placeholder={t("create.fields.title.placeholder")}
          />
          <FieldError id="memory-title-error">{form.fields.title}</FieldError>
        </label>

        <div className={styles.metadata}>
          <label className={styles.field} htmlFor="memory-date">
            <span className={styles.fieldHeading}>
              <strong>{t("create.fields.date.label")}</strong>
              <small>{t("create.required")}</small>
            </span>
            <PastDatePicker
              describedBy={form.fields.memoryDate ? "memory-date-error" : undefined}
              id="memory-date"
              isInvalid={Boolean(form.fields.memoryDate)}
              label={t("create.fields.date.label")}
              onChange={(value) => form.updateValue("memoryDate", value)}
              placeholder={t("create.fields.date.placeholder")}
              value={form.values.memoryDate}
            />
            <FieldError id="memory-date-error">{form.fields.memoryDate}</FieldError>
          </label>
          <label className={styles.field} htmlFor="memory-location">
            <span className={styles.fieldHeading}>
              <strong>{t("create.fields.location.label")}</strong>
              <small>{t("create.optional")}</small>
            </span>
            <span className={styles.inputWithIcon}>
              <MapPin aria-hidden="true" />
              <input
                id="memory-location"
                aria-label={t("create.fields.location.label")}
                value={form.values.location}
                onChange={(event) => form.updateValue("location", event.target.value)}
                aria-describedby={form.fields.location ? "memory-location-error" : undefined}
                aria-invalid={Boolean(form.fields.location)}
                maxLength={150}
                placeholder={t("create.fields.location.placeholder")}
              />
            </span>
            <FieldError id="memory-location-error">{form.fields.location}</FieldError>
          </label>
        </div>

        <div className={styles.contentGrid}>
          <PhotoPicker
            coverPhotoIndex={form.coverPhotoIndex}
            error={form.fields.photos}
            onAdd={form.addPhotos}
            onRemove={form.removePhoto}
            onSelectCover={form.selectCoverPhoto}
            photos={form.photos}
          />

          <section className={styles.detailsSection} aria-label={t("create.sections.details")}>
            <label className={styles.field} htmlFor="memory-description">
              <span className={styles.fieldHeading}>
                <strong>{t("create.fields.description.label")}</strong>
                <small>
                  {form.values.description.length}/2000 · {t("create.optional")}
                </small>
              </span>
              <textarea
                id="memory-description"
                aria-label={t("create.fields.description.label")}
                value={form.values.description}
                onChange={(event) => form.updateValue("description", event.target.value)}
                aria-describedby={form.fields.description ? "memory-description-error" : undefined}
                aria-invalid={Boolean(form.fields.description)}
                maxLength={2000}
                placeholder={t("create.fields.description.placeholder")}
                rows={7}
              />
              <FieldError id="memory-description-error">{form.fields.description}</FieldError>
            </label>

            <fieldset className={styles.placement}>
              <legend>{t("create.placement.legend")}</legend>
              <label>
                <input
                  checked={form.values.visibility === "timeline"}
                  name="visibility"
                  type="radio"
                  onChange={() => form.updateValue("visibility", "timeline")}
                />
                <span>
                  <Sparkles aria-hidden="true" />
                  <strong>{t("create.placement.timeline.label")}</strong>
                  <small>{t("create.placement.timeline.description")}</small>
                </span>
              </label>
              <label>
                <input
                  checked={form.values.visibility === "vault"}
                  name="visibility"
                  type="radio"
                  onChange={() => form.updateValue("visibility", "vault")}
                />
                <span>
                  <LockKeyhole aria-hidden="true" />
                  <strong>{t("create.placement.vault.label")}</strong>
                  <small>{t("create.placement.vault.description")}</small>
                </span>
              </label>
              <FieldError>{form.fields.visibility}</FieldError>
            </fieldset>
          </section>
        </div>

        {form.submitError ? (
          <div className={styles.submitError} role="alert">
            {form.submitError}
          </div>
        ) : null}
        {form.isSubmitting ? (
          <p className={styles.progress} role="status">
            {t("create.status.saving")}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <Link href={APP_ROUTES.TIMELINE}>
            <X aria-hidden="true" />
            {t("create.actions.cancel")}
          </Link>
          <Button className={styles.preserveButton} loading={form.isSubmitting} type="submit">
            {!form.isSubmitting ? <Save aria-hidden="true" /> : null}
            {t("create.actions.preserve")}
          </Button>
        </footer>
      </form>
    </main>
  );
}
