import { describe, expect, it } from "vitest";

import { parseOneJsonObjectV1 } from "./raw-json";

describe("single-root bounded JSON parser", () => {
  it.each([
    '{}',
    '{"value":1,"nested":{"ok":true},"items":[null,false,"text"]}',
    ' \n { "value" : -0.25e2 } \r ',
    '{"emoji":"\\ud83d\\ude00"}',
  ])("accepts one plain object: %s", (input) => {
    expect(parseOneJsonObjectV1(input).ok).toBe(true);
  });

  it.each([
    "```json\n{}\n```", "prefix {}", "{} suffix", "{}{}", "{}[]",
    "[]", '{"a":1,}', '{"a":/*x*/1}', '{"a":01}',
    '{"a":1,"a":2}', '{"é":1,"é":2}', '{"__proto__":1}',
    '{"x":"\\uDC00"}', '{"x":"\\uD800x"}', '{"x":Infinity}',
    "\uFEFF{}", '{"x":"\0"}',
  ])("rejects invalid framing or grammar: %s", (input) => {
    const result = parseOneJsonObjectV1(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("output_invalid_json");
  });

  it.each(["", " \n\t", "{", '{"a"', '{"a":', '{"a":[1,', '{"a":"x'])
    ("distinguishes truncation: %s", (input) => {
      const result = parseOneJsonObjectV1(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(input.trim().length === 0 ? "output_empty" : "output_truncated");
      }
    });

  it("enforces the 96 KiB byte boundary", () => {
    const exact = `{"x":"${"a".repeat(98_296)}"}`;
    expect(Buffer.byteLength(exact)).toBe(98_304);
    expect(parseOneJsonObjectV1(exact).ok).toBe(true);
    const over = `{"x":"${"a".repeat(98_297)}"}`;
    const result = parseOneJsonObjectV1(over);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("output_too_large");
  });

  it("enforces depth and node bounds", () => {
    const deep = `{"x":${"[".repeat(33)}0${"]".repeat(33)}}`;
    expect(parseOneJsonObjectV1(deep).ok).toBe(false);
    const many = `{"x":[${Array.from({ length: 10_001 }, () => "0").join(",")}]}`;
    expect(parseOneJsonObjectV1(many).ok).toBe(false);
  });
});
