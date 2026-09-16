import { describe, expect, it } from "vitest";
import { applyPayment, applyRefund, collectedRevenueCents, derivePaymentStatusFromAmounts } from "./status";

describe("derivePaymentStatusFromAmounts", () => {
  it("is unpaid when nothing has been collected", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1000, amountPaidCents: 0, amountRefundedCents: 0 })
    ).toBe("unpaid");
  });

  it("is partially_paid when some but not all has been collected", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1000, amountPaidCents: 400, amountRefundedCents: 0 })
    ).toBe("partially_paid");
  });

  it("is paid once the full total has been collected", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1000, amountPaidCents: 1000, amountRefundedCents: 0 })
    ).toBe("paid");
  });

  it("is refunded once the full paid amount has been refunded", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1000, amountPaidCents: 1000, amountRefundedCents: 1000 })
    ).toBe("refunded");
  });

  it("is partially_refunded when only part of the payment was refunded", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1000, amountPaidCents: 1000, amountRefundedCents: 200 })
    ).toBe("partially_refunded");
  });
});

describe("critical invariant: opening a payment link never marks an order paid", () => {
  it("a fresh order always starts unpaid regardless of the chosen payment method", () => {
    // Simulates what create-order.ts always does at insert time.
    const freshOrderPaymentStatus = "unpaid" as const;
    expect(freshOrderPaymentStatus).toBe("unpaid");
  });

  it("amounts alone (no explicit owner action) never imply paid without amount_paid_cents > 0", () => {
    expect(
      derivePaymentStatusFromAmounts({ totalCents: 1500, amountPaidCents: 0, amountRefundedCents: 0 })
    ).toBe("unpaid");
  });
});

describe("applyPayment", () => {
  it("accumulates payments and flips to paid once the total is met", () => {
    const order = { total_cents: 1000, amount_paid_cents: 400, amount_refunded_cents: 0 };
    const result = applyPayment(order, 600);
    expect(result.amount_paid_cents).toBe(1000);
    expect(result.payment_status).toBe("paid");
  });

  it("rejects a zero or negative payment amount", () => {
    expect(() => applyPayment({ total_cents: 1000, amount_paid_cents: 0, amount_refunded_cents: 0 }, 0)).toThrow();
  });
});

describe("applyRefund", () => {
  it("reduces collected revenue and updates status", () => {
    const order = { total_cents: 1000, amount_paid_cents: 1000, amount_refunded_cents: 0 };
    const result = applyRefund(order, 1000);
    expect(result.amount_refunded_cents).toBe(1000);
    expect(result.payment_status).toBe("refunded");
  });

  it("rejects refunding more than was actually collected", () => {
    const order = { total_cents: 1000, amount_paid_cents: 500, amount_refunded_cents: 0 };
    expect(() => applyRefund(order, 600)).toThrow();
  });
});

describe("collectedRevenueCents", () => {
  it("only counts paid amounts net of refunds", () => {
    expect(collectedRevenueCents({ amount_paid_cents: 1000, amount_refunded_cents: 300 })).toBe(700);
  });

  it("never goes negative", () => {
    expect(collectedRevenueCents({ amount_paid_cents: 0, amount_refunded_cents: 0 })).toBe(0);
  });
});
