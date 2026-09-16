import { describe, expect, it } from "vitest";
import { DEFAULT_ORDER_STAGES, isTerminalStage, nextStage, validateStatusTransition } from "./status";

describe("isTerminalStage", () => {
  it("flags completed and cancelled as terminal", () => {
    expect(isTerminalStage(DEFAULT_ORDER_STAGES, "completed")).toBe(true);
    expect(isTerminalStage(DEFAULT_ORDER_STAGES, "cancelled")).toBe(true);
  });

  it("flags in-progress stages as non-terminal", () => {
    expect(isTerminalStage(DEFAULT_ORDER_STAGES, "new")).toBe(false);
    expect(isTerminalStage(DEFAULT_ORDER_STAGES, "preparing")).toBe(false);
  });
});

describe("nextStage", () => {
  it("walks the default pipeline in order", () => {
    expect(nextStage(DEFAULT_ORDER_STAGES, "new")?.key).toBe("confirmed");
    expect(nextStage(DEFAULT_ORDER_STAGES, "confirmed")?.key).toBe("preparing");
    expect(nextStage(DEFAULT_ORDER_STAGES, "preparing")?.key).toBe("ready");
    expect(nextStage(DEFAULT_ORDER_STAGES, "ready")?.key).toBe("completed");
  });

  it("returns null once at a terminal stage", () => {
    expect(nextStage(DEFAULT_ORDER_STAGES, "completed")).toBeNull();
  });
});

describe("validateStatusTransition", () => {
  it("allows moving to any configured stage", () => {
    expect(validateStatusTransition(DEFAULT_ORDER_STAGES, "new", "ready")).toEqual({ ok: true });
  });

  it("rejects a stage key that isn't configured", () => {
    const result = validateStatusTransition(DEFAULT_ORDER_STAGES, "new", "on_the_moon");
    expect(result.ok).toBe(false);
  });
});
