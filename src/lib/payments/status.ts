import type { PaymentStatus } from "@/types/database";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending_verification: "Pending Verification",
  partially_paid: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
};

/**
 * The only place payment_status is derived from dollar amounts. Critically,
 * this is never called as a side effect of a customer choosing or opening a
 * payment method — only after the owner records an actual payment or
 * refund. New orders always start at "unpaid" (see createOrder), full stop.
 */
export function derivePaymentStatusFromAmounts(params: {
  totalCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;
}): PaymentStatus {
  const { totalCents, amountPaidCents, amountRefundedCents } = params;

  if (amountRefundedCents > 0) {
    return amountRefundedCents >= amountPaidCents ? "refunded" : "partially_refunded";
  }
  if (amountPaidCents <= 0) {
    return "unpaid";
  }
  if (totalCents > 0 && amountPaidCents >= totalCents) {
    return "paid";
  }
  return "partially_paid";
}

export function applyPayment(
  order: { total_cents: number; amount_paid_cents: number; amount_refunded_cents: number },
  paymentAmountCents: number
): { amount_paid_cents: number; payment_status: PaymentStatus } {
  if (paymentAmountCents <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  const amount_paid_cents = order.amount_paid_cents + paymentAmountCents;
  return {
    amount_paid_cents,
    payment_status: derivePaymentStatusFromAmounts({
      totalCents: order.total_cents,
      amountPaidCents: amount_paid_cents,
      amountRefundedCents: order.amount_refunded_cents,
    }),
  };
}

export function applyRefund(
  order: { total_cents: number; amount_paid_cents: number; amount_refunded_cents: number },
  refundAmountCents: number
): { amount_refunded_cents: number; payment_status: PaymentStatus } {
  if (refundAmountCents <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }
  if (refundAmountCents > order.amount_paid_cents - order.amount_refunded_cents) {
    throw new Error("Refund amount cannot exceed the amount actually collected.");
  }
  const amount_refunded_cents = order.amount_refunded_cents + refundAmountCents;
  return {
    amount_refunded_cents,
    payment_status: derivePaymentStatusFromAmounts({
      totalCents: order.total_cents,
      amountPaidCents: order.amount_paid_cents,
      amountRefundedCents: amount_refunded_cents,
    }),
  };
}

/** Only "paid", "partially_paid", and the paid portion of a refund count as collected revenue. */
export function collectedRevenueCents(order: {
  amount_paid_cents: number;
  amount_refunded_cents: number;
}): number {
  return Math.max(0, order.amount_paid_cents - order.amount_refunded_cents);
}
