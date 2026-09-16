import { describe, expect, it } from "vitest";
import { calculateOrderTotals, formatCents, lineTotalCents, outstandingBalanceCents } from "./totals";

describe("lineTotalCents", () => {
  it("multiplies unit price by quantity", () => {
    expect(lineTotalCents({ unitPriceCents: 900, quantity: 3 })).toBe(2700);
  });

  it("adds variant option deltas before multiplying by quantity", () => {
    expect(
      lineTotalCents({ unitPriceCents: 900, quantity: 2, optionDeltasCents: [800, 100] })
    ).toBe((900 + 800 + 100) * 2);
  });
});

describe("calculateOrderTotals", () => {
  it("computes subtotal, tax, and total with no adjustments or fees", () => {
    const totals = calculateOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 2 }],
      taxRateBps: 875, // 8.75%
    });
    expect(totals.subtotalCents).toBe(2000);
    expect(totals.taxCents).toBe(175); // 2000 * 0.0875 = 175
    expect(totals.discountCents).toBe(0);
    expect(totals.fulfillmentFeeCents).toBe(0);
    expect(totals.totalCents).toBe(2175);
  });

  it("applies a discount before computing tax, and adds fulfillment fee after tax", () => {
    const totals = calculateOrderTotals({
      lines: [{ unitPriceCents: 2000, quantity: 1 }],
      adjustments: [{ amountCents: -500 }],
      taxRateBps: 1000, // 10%
      fulfillmentFeeCents: 300,
    });
    expect(totals.subtotalCents).toBe(2000);
    expect(totals.discountCents).toBe(500);
    // taxable base = 2000 - 500 = 1500; 10% = 150
    expect(totals.taxCents).toBe(150);
    expect(totals.fulfillmentFeeCents).toBe(300);
    expect(totals.totalCents).toBe(2000 - 500 + 150 + 300);
  });

  it("adds positive adjustments (custom charges) into the total", () => {
    const totals = calculateOrderTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      adjustments: [{ amountCents: 250 }],
      taxRateBps: 0,
    });
    expect(totals.totalCents).toBe(1250);
  });

  it("never produces a negative total even with a discount larger than the subtotal", () => {
    const totals = calculateOrderTotals({
      lines: [{ unitPriceCents: 500, quantity: 1 }],
      adjustments: [{ amountCents: -5000 }],
      taxRateBps: 875,
    });
    expect(totals.totalCents).toBe(0);
    expect(totals.taxCents).toBe(0);
  });

  it("rounds fractional cents of tax to the nearest cent", () => {
    const totals = calculateOrderTotals({
      lines: [{ unitPriceCents: 333, quantity: 1 }],
      taxRateBps: 875,
    });
    // 333 * 0.0875 = 29.1375 -> rounds to 29
    expect(totals.taxCents).toBe(29);
  });
});

describe("formatCents", () => {
  it("formats integer cents as a currency string", () => {
    expect(formatCents(1234)).toBe("$12.34");
  });
});

describe("outstandingBalanceCents", () => {
  it("is zero once fully paid", () => {
    expect(
      outstandingBalanceCents({ total_cents: 1000, amount_paid_cents: 1000, amount_refunded_cents: 0 })
    ).toBe(0);
  });

  it("reflects a partial payment", () => {
    expect(
      outstandingBalanceCents({ total_cents: 1000, amount_paid_cents: 400, amount_refunded_cents: 0 })
    ).toBe(600);
  });

  it("increases again after a refund", () => {
    expect(
      outstandingBalanceCents({ total_cents: 1000, amount_paid_cents: 1000, amount_refunded_cents: 300 })
    ).toBe(300);
  });
});
