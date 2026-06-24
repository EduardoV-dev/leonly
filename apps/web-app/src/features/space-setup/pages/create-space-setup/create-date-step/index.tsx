import { Calendar } from "@/components/ui/calendar";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/shadcn-button";
import { APP_ROUTES } from "@/constants/routes";
import { normalizeLanguage } from "@/lib/i18n";
import { cn } from "@/utils/merge-class-names";
import { format, isValid, parse } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import type { Control, FieldError } from "react-hook-form";
import { useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { BackLink } from "../../../components/back-link";
import styles from "../../../components/space-setup-step/space-setup-step.module.css";
import { StepMarker } from "../../../components/step-marker";
import type { CreateSpaceSetupFormValues } from "../../../hooks/use-create-space-setup-form";

type CreateDateStepProps = {
  control: Control<CreateSpaceSetupFormValues>;
  firstDayError?: FieldError;
  onContinue: () => void;
};

function parseStoredDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsedDate = parse(value, "yyyy-MM-dd", new Date());

  return isValid(parsedDate) ? parsedDate : undefined;
}

function isFutureDate(date: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return date > today;
}

export function CreateDateStep({ control, firstDayError, onContinue }: CreateDateStepProps) {
  const { t, i18n } = useTranslation("spaceSetup");
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const firstDayErrorId = "first-day-error";
  const currentLanguage = normalizeLanguage(i18n.language);
  const calendarLocale = currentLanguage === "es" ? es : enUS;
  const { field } = useController({
    control,
    name: "firstDay",
  });
  const selectedDate = useMemo(() => parseStoredDate(field.value), [field.value]);

  const handleSelect = (date: Date | undefined) => {
    if (date && isFutureDate(date)) {
      return;
    }

    field.onChange(date ? format(date, "yyyy-MM-dd") : "");

    if (date) {
      setOpen(false);
    }
  };

  return (
    <div>
      <StepMarker step={2} total={3} />
      <h1 className={styles.heading}>{t("steps.date.heading")}</h1>
      <p className={styles.copy}>{t("steps.date.description")}</p>

      <div className={styles.dateCard}>
        <FieldGroup>
          <Field className={styles.dateField}>
            <FieldLabel className={styles.label} htmlFor="first-day-trigger">
              {t("steps.date.firstDayLabel")}
            </FieldLabel>
            <FieldContent>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="first-day-trigger"
                    variant="outline"
                    className={cn(
                      styles.input,
                      styles.datePickerTrigger,
                      !selectedDate && styles.datePickerPlaceholder,
                    )}
                    aria-describedby={firstDayError ? firstDayErrorId : undefined}
                    aria-invalid={Boolean(firstDayError)}
                  >
                    <span>
                      {selectedDate
                        ? format(selectedDate, "PPP", { locale: calendarLocale })
                        : t("steps.date.firstDayLabel")}
                    </span>
                    <CalendarDays data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className={cn(styles.datePopover, "w-auto p-0")}>
                  <Calendar
                    key={currentLanguage}
                    mode="single"
                    selected={selectedDate}
                    captionLayout="dropdown"
                    startMonth={new Date(currentYear - 20, 0)}
                    endMonth={new Date(currentYear, 11)}
                    defaultMonth={selectedDate ?? new Date(currentYear, 0)}
                    disabled={{ after: new Date() }}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        format(date, "LLL", { locale: calendarLocale }),
                    }}
                    locale={calendarLocale}
                    onSelect={handleSelect}
                    timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                  />
                </PopoverContent>
              </Popover>
              {firstDayError ? (
                <p id={firstDayErrorId} className={styles.fieldError}>
                  {firstDayError.message}
                </p>
              ) : null}
            </FieldContent>
          </Field>
        </FieldGroup>

        <button
          type="button"
          className={`${styles.linkButton} ${styles.primaryButton}`}
          onClick={onContinue}
        >
          {t("actions.continue")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <BackLink href={APP_ROUTES.WELCOME_CREATE_STEP("name")} />
      </div>

      <p className={styles.note}>"{t("steps.date.note")}"</p>
    </div>
  );
}
