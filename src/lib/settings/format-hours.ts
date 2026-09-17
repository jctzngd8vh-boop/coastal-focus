import type { BusinessHoursEntry } from "@/types/database";

const DAY_ABBREVIATIONS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function formatTime(value: string): string {
  const [hourStr, minuteStr] = value.split(":");
  const hour = parseInt(hourStr, 10);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const minute = minuteStr && minuteStr !== "00" ? `:${minuteStr}` : "";
  return `${displayHour}${minute} ${period}`;
}

function lineFor(entry: BusinessHoursEntry): string {
  return entry.closed ? "Closed" : `${formatTime(entry.open)}–${formatTime(entry.close)}`;
}

/**
 * Collapses consecutive days with identical hours into a range, e.g.
 * Mon–Fri 9 AM–5 PM / Sat 10 AM–2 PM / Sun Closed, instead of one line per day.
 */
export function formatBusinessHours(hours: BusinessHoursEntry[]): string[] {
  if (hours.length === 0) return [];

  const groups: { days: string[]; line: string }[] = [];

  for (const entry of hours) {
    const line = lineFor(entry);
    const last = groups[groups.length - 1];
    if (last && last.line === line) {
      last.days.push(entry.day);
    } else {
      groups.push({ days: [entry.day], line });
    }
  }

  return groups.map(({ days, line }) => {
    const abbreviated = days.map((d) => DAY_ABBREVIATIONS[d] ?? d.slice(0, 3));
    const dayLabel =
      abbreviated.length > 1 ? `${abbreviated[0]}–${abbreviated[abbreviated.length - 1]}` : abbreviated[0];
    return `${dayLabel}: ${line}`;
  });
}
