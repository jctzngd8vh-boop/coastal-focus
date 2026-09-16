import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("builds a header row and one row per item", () => {
    const csv = toCsv(
      [
        { name: "Jane", total: 1000 },
        { name: "Bo", total: 500 },
      ],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Total", value: (r) => r.total },
      ]
    );
    expect(csv).toBe("Name,Total\r\nJane,1000\r\nBo,500");
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      [{ note: 'Says "hi", then leaves\nnext line' }],
      [{ header: "Note", value: (r) => r.note }]
    );
    expect(csv).toBe('Note\r\n"Says ""hi"", then leaves\nnext line"');
  });

  it("renders null/undefined as an empty cell", () => {
    const csv = toCsv([{ v: null }], [{ header: "V", value: (r) => r.v }]);
    expect(csv).toBe("V\r\n");
  });
});
