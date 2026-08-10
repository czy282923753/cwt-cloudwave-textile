import { parseOneJsonObjectV1 } from "@/ai/output/raw-json";

function result(input: unknown) {
  const parsed = parseOneJsonObjectV1(input);
  return parsed.ok ? "accepted" : parsed.error.code;
}

const exactByteBoundary = `{"fresh":"${"界".repeat(32_763)}abc"}`;
if (Buffer.byteLength(exactByteBoundary, "utf8") !== 98_304) {
  throw new Error("reviewer byte-boundary fixture is not exact");
}
const overByteBoundary = `${exactByteBoundary.slice(0, -2)}aa"}`;

const output = {
  escapedDuplicate: result('{"a":1,"\\u0061":2}'),
  nestedDuplicate: result('{"outer":{"fresh":1,"fresh":2}}'),
  normalizedDuplicate: result('{"e\\u0301":1,"é":2}'),
  fenced: result('```json\n{"fresh":true}\n```'),
  concatenated: result('{"fresh":true}{"second":true}'),
  truncatedEscape: result('{"fresh":"\\uD83D'),
  exactByteBoundary: result(exactByteBoundary),
  overByteBoundary: result(overByteBoundary),
  exactMemberBoundary: result(`{${Array.from({ length: 2_000 }, (_, index) =>
    `"k${index}":null`).join(",")}}`),
  overMemberBoundary: result(`{${Array.from({ length: 2_001 }, (_, index) =>
    `"k${index}":null`).join(",")}}`),
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
