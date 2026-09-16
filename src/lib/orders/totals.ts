/**
 * All monetary math happens here, entirely in integer cents. Never use
 * floating point for money — multiply/divide with integers and round with
 * Math.round only at basis-point boundaries.
 */

export interface CartLineInput {
  unitPriceCents: number;
  quantity: number;
  optionDeltasCents?: number[];
}

export interface OrderAdjustmentInput {
  amountCents: number;
}

export interface OrderTotalsInput {
  lines: CartLineInput[];
  adjustments?: OrderAdjustmentInput[];
  taxRateBps: number;
  fulfillmentFeeCents?: number;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  fulfillmentFeeCents: number;
  totalCents: number;
}

export function lineTotalCents(line: CartLineInput): number {
  const optionsTotal = (line.optionDeltasCents ?? []).reduce((sum, d) => sum + d, 0);
  return (line.unitPriceCents + optionsTotal) * line.quantity;
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotalCents = input.lines.reduce((sum, line) => sum + lineTotalCents(line), 0);

  const discountCents = (input.adjustments ?? [])
    .filter((a) => a.amountCents < 0)
    .reduce((sum, a) => sum + Math.abs(a.amountCents), 0);

  const customChargesCents = (input.adjustments ?? [])
    .filter((a) => a.amountCents > 0)
    .reduce((sum, a) => sum + a.amountCents, 0);

  const fulfillmentFeeCents = input.fulfillmentFeeCents ?? 0;

  const taxableBase = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round((taxableBase * input.taxRateBps) / 10000);

  const totalCents = Math.max(
    0,
    subtotalCents - discountCents + customChargesCents + taxCents + fulfillmentFeeCents
  );

  return {
    subtotalCents,
    discountCents,
    taxCents,
    fulfillmentFeeCents,
    totalCents,
  };
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function outstandingBalanceCents(order: {
  total_cents: number;
  amount_paid_cents: number;
  amount_refunded_cents: number;
}): number {
  return Math.max(0, order.total_cents - order.amount_paid_cents + order.amount_refunded_cents);
}
