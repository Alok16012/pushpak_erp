import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A date field with a real calendar behind it.
 *
 * Every date in this app was a native `<input type="date">`, which is a
 * different control on every browser and, on the ones the office actually uses,
 * a three-box spinner with no month or year to jump by -- picking a date of
 * birth meant clicking back through four hundred months.
 *
 * The value stays `yyyy-mm-dd`, exactly what the input gave, so this drops into
 * the same state every form already keeps.
 */

/** Parsed as a local day, not as an instant: `new Date("2026-09-25")` is UTC
 *  midnight, which is the day before in every timezone west of Greenwich and
 *  the wrong day here for anyone reading it back. */
const parse = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** The inverse, and for the same reason: no `toISOString` anywhere near it. */
const format = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/** `25 Sep 2026`. Written out rather than left to Intl, whose short month is
 *  "Sept" in some builds and "Sep" in others -- a column of dates should not
 *  change width depending on the machine it is read on. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const readable = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export interface DatePickerProps {
  /** Controlled value, `yyyy-mm-dd`. Omit it to let the picker hold its own. */
  value?: string;
  onChange?: (value: string) => void;
  /** Submits the value under this key, for the forms that read themselves with
   *  `FormData` rather than keeping state. */
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Narrows the year dropdown. Defaults to a range a school actually uses. */
  fromYear?: number;
  toYear?: number;
  /** `yyyy-mm-dd`, as the native input's own min/max were: days outside the
   *  range cannot be picked. A session's admission window is one of these. */
  min?: string;
  max?: string;
  /** Marks the field as holding a value the form has refused, the way
   *  `aria-invalid` did on the input this replaced. */
  invalid?: boolean;
  "aria-label"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  id,
  disabled,
  className,
  name,
  defaultValue = "",
  fromYear = 1950,
  toYear = new Date().getFullYear() + 10,
  min,
  max,
  invalid,
  ...rest
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState(defaultValue);
  const current = value !== undefined ? value : own;
  const set = (next: string) => {
    if (value === undefined) setOwn(next);
    onChange?.(next);
  };
  const selected = parse(current);
  const earliest = parse(min || "");
  const latest = parse(max || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={rest["aria-label"]}
          aria-invalid={invalid || undefined}
          className={cn(
            invalid && "border-destructive text-destructive",
            "h-10 w-full justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />
          {selected ? readable(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          // Month and year as dropdowns: the whole point of replacing the
          // native control was not having to step through them one at a time.
          captionLayout="dropdown-buttons"
          /*
           * This project styles the calendar entirely through classNames and
           * never loads react-day-picker's own stylesheet, so the pieces that
           * sheet hides -- its screen-reader caption, and the decorative label
           * it draws behind each dropdown -- were being drawn on top of the
           * dropdowns as loose text. Hide them here and dress the selects.
           */
          classNames={{
            caption_dropdowns: "flex items-center gap-2",
            caption_label: "sr-only",
            vhidden: "sr-only",
            dropdown:
              "h-8 rounded-md border border-input bg-background px-2 text-sm font-medium",
            dropdown_month: "relative",
            dropdown_year: "relative",
          }}
          // A bounded field drives the dropdowns from its own range, so the
          // years a session does not cover are not offered at all.
          fromYear={earliest ? earliest.getFullYear() : fromYear}
          toYear={latest ? latest.getFullYear() : toYear}
          fromDate={earliest}
          toDate={latest}
          onSelect={(date) => {
            set(date ? format(date) : "");
            setOpen(false);
          }}
          initialFocus
        />
        {current && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                set("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
      {name && <input type="hidden" name={name} value={current} />}
    </Popover>
  );
}
