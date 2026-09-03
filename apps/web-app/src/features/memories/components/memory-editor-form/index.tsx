"use client";

import { ArrowLeft, LockKeyhole, MapPin, Save, Sparkles, X } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PastDatePicker } from "@/components/past-date-picker";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { MemoryEditorPhoto, MemoryEditorValues } from "../../types/memory-editor";
import { MemoryEditorPhotoWorkspace } from "../memory-editor-photo-workspace";
import styles from "./memory-editor-form.module.css";
import wideStyles from "./memory-editor-form-wide.module.css";

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
};
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.04, staggerChildren: 0.05 } },
};
const reducedMotionVariants: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };

export type MemoryEditorFormProps = {
  backHref: string;
  coverPhotoKey: string | null;
  isConflict?: boolean;
  fields: Record<string, string>;
  isSubmitting: boolean;
  maxPhotos: number;
  mode: "create" | "edit";
  onAddPhotos: (photos: File[]) => void;
  onRemovePhoto: (key: string) => void;
  onReload?: () => void;
  onSelectCover: (key: string) => void;
  onSubmit: () => Promise<void>;
  onUpdateValue: <TKey extends keyof MemoryEditorValues>(
    key: TKey,
    value: MemoryEditorValues[TKey],
  ) => void;
  photos: MemoryEditorPhoto[];
  submitError: string | null;
  values: MemoryEditorValues;
};

export function MemoryEditorForm({
  backHref,
  coverPhotoKey,
  fields,
  isConflict = false,
  isSubmitting,
  maxPhotos,
  mode,
  onAddPhotos,
  onRemovePhoto,
  onReload,
  onSelectCover,
  onSubmit,
  photos,
  submitError,
  onUpdateValue,
  values,
}: Readonly<MemoryEditorFormProps>) {
  const { t } = useTranslation("memories");
  const formRef = useRef<HTMLFormElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const activeVariants = shouldReduceMotion ? reducedMotionVariants : revealVariants;
  const isDraftLocked = isSubmitting || isConflict;

  useEffect(() => {
    if (Object.keys(fields).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [fields]);

  return (
    <motion.main
      className={`${styles.page} ${wideStyles.page}`}
      variants={shouldReduceMotion ? reducedMotionVariants : pageVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={activeVariants}>
        <Link
          aria-disabled={isSubmitting}
          className={styles.backLink}
          href={backHref}
          tabIndex={isSubmitting ? -1 : undefined}
          onClick={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
        >
          <ArrowLeft aria-hidden="true" />
          {t(mode === "create" ? "create.backToTimeline" : "edit.backToDetail")}
        </Link>
      </motion.div>
      <motion.header className={`${styles.intro} ${wideStyles.intro}`} variants={activeVariants}>
        <h1>{t(mode === "create" ? "create.heading" : "edit.heading")}</h1>
        <p>{t(mode === "create" ? "create.intro" : "edit.intro")}</p>
      </motion.header>

      <motion.form
        className={`${styles.form} ${wideStyles.form}`}
        noValidate
        ref={formRef}
        variants={activeVariants}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <motion.label
          className={`${styles.field} ${styles.titleField} ${wideStyles.titleField}`}
          htmlFor="memory-title"
          inert={isDraftLocked ? true : undefined}
          variants={activeVariants}
        >
          <span className={styles.fieldHeading}>
            <strong>{t("create.fields.title.label")}</strong>
            <small>{values.title.length}/120</small>
          </span>
          <input
            id="memory-title"
            aria-label={t("create.fields.title.label")}
            name="title"
            value={values.title}
            disabled={isDraftLocked}
            onChange={(event) => onUpdateValue("title", event.target.value)}
            aria-describedby={fields.title ? "memory-title-error" : undefined}
            aria-invalid={Boolean(fields.title)}
            aria-required="true"
            autoComplete="off"
            maxLength={120}
            placeholder={t("create.fields.title.placeholder")}
          />
          <FieldError id="memory-title-error">{fields.title}</FieldError>
        </motion.label>

        <motion.div
          className={`${styles.metadata} ${wideStyles.metadata}`}
          inert={isDraftLocked ? true : undefined}
          variants={activeVariants}
        >
          <label className={styles.field} htmlFor="memory-date">
            <span className={styles.fieldHeading}>
              <strong>{t("create.fields.date.label")}</strong>
              <small>{t("create.required")}</small>
            </span>
            <PastDatePicker
              describedBy={fields.memoryDate ? "memory-date-error" : undefined}
              id="memory-date"
              isInvalid={Boolean(fields.memoryDate)}
              label={t("create.fields.date.label")}
              onChange={(value) => onUpdateValue("memoryDate", value)}
              placeholder={t("create.fields.date.placeholder")}
              value={values.memoryDate}
            />
            <FieldError id="memory-date-error">{fields.memoryDate}</FieldError>
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
                name="location"
                value={values.location}
                disabled={isDraftLocked}
                onChange={(event) => onUpdateValue("location", event.target.value)}
                aria-describedby={fields.location ? "memory-location-error" : undefined}
                aria-invalid={Boolean(fields.location)}
                autoComplete="off"
                maxLength={150}
                placeholder={t("create.fields.location.placeholder")}
              />
            </span>
            <FieldError id="memory-location-error">{fields.location}</FieldError>
          </label>
        </motion.div>

        <motion.div
          className={`${styles.contentGrid} ${wideStyles.contentGrid}`}
          inert={isDraftLocked ? true : undefined}
          variants={activeVariants}
        >
          <MemoryEditorPhotoWorkspace
            coverPhotoKey={coverPhotoKey}
            error={fields.photos}
            isDisabled={isDraftLocked}
            maxPhotos={maxPhotos}
            mode={mode}
            onAdd={onAddPhotos}
            onRemove={onRemovePhoto}
            onSelectCover={onSelectCover}
            photos={photos}
          />
          <section
            className={`${styles.detailsSection} ${wideStyles.detailsSection}`}
            aria-label={t("create.sections.details")}
          >
            <label className={styles.field} htmlFor="memory-description">
              <span className={styles.fieldHeading}>
                <strong>{t("create.fields.description.label")}</strong>
                <small>
                  {values.description.length}/2000 · {t("create.optional")}
                </small>
              </span>
              <textarea
                id="memory-description"
                aria-label={t("create.fields.description.label")}
                name="description"
                value={values.description}
                disabled={isDraftLocked}
                onChange={(event) => onUpdateValue("description", event.target.value)}
                aria-describedby={fields.description ? "memory-description-error" : undefined}
                aria-invalid={Boolean(fields.description)}
                autoComplete="off"
                maxLength={2000}
                placeholder={t("create.fields.description.placeholder")}
                rows={7}
              />
              <FieldError id="memory-description-error">{fields.description}</FieldError>
            </label>
            <fieldset className={styles.placement} disabled={isDraftLocked}>
              <legend>{t("create.placement.legend")}</legend>
              <label>
                <input
                  checked={values.visibility === "timeline"}
                  name="visibility"
                  type="radio"
                  onChange={() => onUpdateValue("visibility", "timeline")}
                />
                <span>
                  <Sparkles aria-hidden="true" />
                  <strong>{t("create.placement.timeline.label")}</strong>
                  <small>{t("create.placement.timeline.description")}</small>
                </span>
              </label>
              <label>
                <input
                  checked={values.visibility === "vault"}
                  name="visibility"
                  type="radio"
                  onChange={() => onUpdateValue("visibility", "vault")}
                />
                <span>
                  <LockKeyhole aria-hidden="true" />
                  <strong>{t("create.placement.vault.label")}</strong>
                  <small>{t("create.placement.vault.description")}</small>
                </span>
              </label>
              <FieldError>{fields.visibility}</FieldError>
            </fieldset>
          </section>
        </motion.div>

        {isConflict ? (
          <motion.section
            className={`${styles.conflict} ${wideStyles.feedback}`}
            role="alert"
            variants={activeVariants}
          >
            <h2>{t("edit.conflict.heading")}</h2>
            <p>{t("edit.conflict.description")}</p>
            <div>
              <button type="button" onClick={onReload}>
                {t("edit.conflict.reload")}
              </button>
              <Link href={backHref}>{t("edit.conflict.return")}</Link>
            </div>
          </motion.section>
        ) : submitError || isSubmitting ? (
          <motion.div className={wideStyles.feedback} variants={activeVariants}>
            {submitError ? (
              <div className={styles.submitError} role="alert">
                {submitError}
              </div>
            ) : null}
            {isSubmitting ? (
              <p className={styles.progress} role="status" aria-live="polite">
                {t(mode === "create" ? "create.status.saving" : "edit.status.saving")}
              </p>
            ) : null}
          </motion.div>
        ) : null}
        <motion.footer
          className={`${styles.actions} ${wideStyles.actions}`}
          variants={activeVariants}
        >
          <Link
            aria-disabled={isSubmitting}
            href={backHref}
            tabIndex={isSubmitting ? -1 : undefined}
            onClick={(event) => {
              if (isSubmitting) event.preventDefault();
            }}
          >
            <X aria-hidden="true" />
            {t("create.actions.cancel")}
          </Link>
          <Button
            className={styles.preserveButton}
            disabled={isConflict}
            loading={isSubmitting}
            type="submit"
          >
            {!isSubmitting ? <Save aria-hidden="true" /> : null}
            {t(
              isSubmitting
                ? mode === "create"
                  ? "create.status.saving"
                  : "edit.status.saving"
                : mode === "create"
                  ? "create.actions.preserve"
                  : "edit.actions.save",
            )}
          </Button>
        </motion.footer>
      </motion.form>
    </motion.main>
  );
}
