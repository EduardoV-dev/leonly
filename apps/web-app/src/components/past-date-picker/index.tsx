"use client";

import { format, isValid, parse } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/shadcn-button";
import { normalizeLanguage } from "@/lib/i18n";
import styles from "./past-date-picker.module.css";

type PastDatePickerProps = Readonly<{
  describedBy?: string;
  id: string;
  isInvalid?: boolean;
  label: string;
  latestDate?: Date;
  onChange: (value: string) => void;
  placeholder: string;
  startMonth?: Date;
  value: string;
}>;

function parseStoredDate(value: string, referenceDate: Date): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsedDate = parse(value, "yyyy-MM-dd", referenceDate);
  return isValid(parsedDate) ? parsedDate : undefined;
}

function isAfterLatestDate(date: Date, latestDate: Date): boolean {
  const endOfLatestDate = new Date(latestDate);
  endOfLatestDate.setHours(23, 59, 59, 999);
  return date > endOfLatestDate;
}

export function PastDatePicker({
  describedBy,
  id,
  isInvalid = false,
  label,
  latestDate = new Date(),
  onChange,
  placeholder,
  startMonth,
  value,
}: PastDatePickerProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = normalizeLanguage(i18n.language);
  const calendarLocale = currentLanguage === "es" ? es : enUS;
  const selectedDate = parseStoredDate(value, latestDate);

  const handleSelect = (date: Date | undefined) => {
    if (date && isAfterLatestDate(date, latestDate)) {
      return;
    }

    onChange(date ? format(date, "yyyy-MM-dd") : "");

    if (date) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={styles.trigger}
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
          aria-label={label}
        >
          <span className={!selectedDate ? styles.placeholder : undefined}>
            {selectedDate ? format(selectedDate, "PPP", { locale: calendarLocale }) : placeholder}
          </span>
          <CalendarDays aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className={`${styles.popover} w-auto p-0`}>
        <Calendar
          key={currentLanguage}
          mode="single"
          selected={selectedDate}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={new Date(latestDate.getFullYear(), latestDate.getMonth())}
          defaultMonth={selectedDate ?? latestDate}
          disabled={{ after: latestDate }}
          formatters={{
            formatMonthDropdown: (date) => format(date, "LLL", { locale: calendarLocale }),
          }}
          locale={calendarLocale}
          onSelect={handleSelect}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        />
      </PopoverContent>
    </Popover>
  );
}
