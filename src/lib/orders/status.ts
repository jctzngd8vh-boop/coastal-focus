import type { OrderStage } from "@/types/database";

export const DEFAULT_ORDER_STAGES: OrderStage[] = [
  { key: "new", label: "New", sort_order: 0, is_terminal: false, color: "blue" },
  { key: "confirmed", label: "Confirmed", sort_order: 1, is_terminal: false, color: "indigo" },
  { key: "preparing", label: "Preparing", sort_order: 2, is_terminal: false, color: "amber" },
  { key: "ready", label: "Ready", sort_order: 3, is_terminal: false, color: "emerald" },
  { key: "completed", label: "Completed", sort_order: 4, is_terminal: true, color: "slate" },
  { key: "cancelled", label: "Cancelled", sort_order: 5, is_terminal: true, color: "red" },
];

export function isTerminalStage(stages: OrderStage[], key: string): boolean {
  return stages.find((s) => s.key === key)?.is_terminal ?? false;
}

export function assertValidStage(stages: OrderStage[], key: string): void {
  if (!stages.some((s) => s.key === key)) {
    throw new Error(`Unknown order stage: ${key}`);
  }
}

/** The suggested next non-terminal stage in the configured pipeline, or null at the end. */
export function nextStage(stages: OrderStage[], currentKey: string): OrderStage | null {
  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const currentIndex = sorted.findIndex((s) => s.key === currentKey);
  if (currentIndex === -1) return null;

  for (let i = currentIndex + 1; i < sorted.length; i++) {
    if (!sorted[i].is_terminal || sorted[i].key === "completed") {
      return sorted[i];
    }
  }
  return null;
}

/**
 * Small businesses need to be able to correct mistakes, so any stage change
 * is allowed as long as the target stage exists. The only thing this guards
 * against is silently "moving" an order into a status the owner never
 * configured (e.g. a stale key after stages were edited).
 */
export function validateStatusTransition(
  stages: OrderStage[],
  _fromKey: string,
  toKey: string
): { ok: true } | { ok: false; reason: string } {
  if (!stages.some((s) => s.key === toKey)) {
    return { ok: false, reason: `"${toKey}" is not a configured order stage.` };
  }
  return { ok: true };
}
