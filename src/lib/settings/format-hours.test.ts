import { describe, expect, it } from "vitest";
import { formatBusinessHours } from "./format-hours";

describe("formatBusinessHours", () => {
  it("returns an empty array when no hours are set", () => {
    expect(formatBusinessHours([])).toEqual([]);
  });

  it("groups consecutive days with identical hours into a range", () => {
    const hours = [
      { day: "Monday", open: "09:00", close: "17:00", closed: false },
      { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
      { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
      { day: "Thursday", open: "09:00", close: "17:00", closed: false },
      { day: "Friday", open: "09:00", close: "17:00", closed: false },
      { day: "Saturday", open: "10:00", close: "14:00", closed: false },
      { day: "Sunday", open: "09:00", close: "17:00", closed: true },
    ];
    expect(formatBusinessHours(hours)).toEqual([
      "Mon–Fri: 9 AM–5 PM",
      "Sat: 10 AM–2 PM",
      "Sun: Closed",
    ]);
  });

  it("formats a single day without a range dash", () => {
    expect(formatBusinessHours([{ day: "Monday", open: "09:00", close: "17:00", closed: false }])).toEqual([
      "Mon: 9 AM–5 PM",
    ]);
  });

  it("preserves non-zero minutes", () => {
    expect(formatBusinessHours([{ day: "Monday", open: "09:30", close: "17:15", closed: false }])).toEqual([
      "Mon: 9:30 AM–5:15 PM",
    ]);
  });
});
