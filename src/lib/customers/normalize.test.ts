import { describe, expect, it } from "vitest";
import { findDuplicateCustomer, formatPhoneForDisplay, normalizeEmail, normalizePhone } from "./normalize";

describe("normalizePhone", () => {
  it("normalizes a 10-digit US number to E.164", () => {
    expect(normalizePhone("(619) 555-0134")).toBe("+16195550134");
  });

  it("normalizes an 11-digit number already prefixed with 1", () => {
    expect(normalizePhone("1-619-555-0134")).toBe("+16195550134");
  });

  it("treats differently formatted input for the same number identically", () => {
    expect(normalizePhone("619.555.0134")).toBe(normalizePhone("(619) 555-0134"));
  });

  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane@Example.COM ")).toBe("jane@example.com");
  });

  it("returns null for empty input", () => {
    expect(normalizeEmail("   ")).toBeNull();
  });
});

describe("formatPhoneForDisplay", () => {
  it("formats a normalized E.164 number for humans", () => {
    expect(formatPhoneForDisplay("+16195550134")).toBe("(619) 555-0134");
  });
});

describe("findDuplicateCustomer", () => {
  const candidates = [
    { id: "1", phone_normalized: "+16195550134", email_normalized: "jane@example.com" },
    { id: "2", phone_normalized: "+16195559999", email_normalized: "other@example.com" },
  ];

  it("matches on phone", () => {
    expect(findDuplicateCustomer(candidates, "+16195550134", null)?.id).toBe("1");
  });

  it("matches on email even if phone differs", () => {
    expect(findDuplicateCustomer(candidates, "+19998887777", "jane@example.com")?.id).toBe("1");
  });

  it("returns null when nothing matches", () => {
    expect(findDuplicateCustomer(candidates, "+10000000000", "nobody@example.com")).toBeNull();
  });
});
