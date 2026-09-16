import { describe, expect, it } from "vitest";
import { buildMailtoLink, buildSmsLink, buildTelLink, interpolateTemplate } from "./templates";

describe("interpolateTemplate", () => {
  it("replaces known variables", () => {
    expect(interpolateTemplate("Hi {{first_name}}, order {{order_number}} is ready.", {
      first_name: "Jane",
      order_number: "ORD-00042",
    })).toBe("Hi Jane, order ORD-00042 is ready.");
  });

  it("leaves unknown placeholders untouched so typos are visible", () => {
    expect(interpolateTemplate("Hi {{nickname}}", { first_name: "Jane" })).toBe("Hi {{nickname}}");
  });
});

describe("native app links", () => {
  it("builds a tel: link", () => {
    expect(buildTelLink("+16195550134")).toBe("tel:%2B16195550134");
  });

  it("builds an sms: link with a prefilled body", () => {
    const link = buildSmsLink("+16195550134", "Hi there!");
    expect(link.startsWith("sms:%2B16195550134")).toBe(true);
    expect(link).toContain("body=Hi%20there!");
  });

  it("builds a mailto: link with subject and body", () => {
    const link = buildMailtoLink("jane@example.com", "Order ready", "Come pick it up!");
    expect(link.startsWith("mailto:jane%40example.com?")).toBe(true);
    expect(link).toContain("subject=Order+ready");
  });
});
