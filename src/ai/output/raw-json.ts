import type { ReadonlyJsonObject, ReadonlyJsonValue } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";

const MAX_BYTES = 98_304;
const MAX_DEPTH = 32;
const MAX_VALUES = 10_000;
const MAX_MEMBERS = 2_000;
const MAX_ARRAY_ENTRIES = 10_000;

class JsonSyntaxFailure extends Error {
  constructor(readonly truncated: boolean) {
    super(truncated ? "truncated" : "invalid");
  }
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

class BoundedJsonParser {
  private position = 0;
  private values = 0;
  private members = 0;
  private arrayEntries = 0;

  constructor(private readonly text: string) {}

  parseRoot(): ReadonlyJsonObject {
    this.whitespace();
    if (this.peek() !== "{") throw new JsonSyntaxFailure(this.atEnd());
    const value = this.object(1);
    this.whitespace();
    if (!this.atEnd()) throw new JsonSyntaxFailure(false);
    return value;
  }

  private atEnd(): boolean {
    return this.position >= this.text.length;
  }

  private peek(): string | undefined {
    return this.text[this.position];
  }

  private take(expected?: string): string {
    const value = this.peek();
    if (value === undefined) throw new JsonSyntaxFailure(true);
    if (expected !== undefined && value !== expected) throw new JsonSyntaxFailure(false);
    this.position += 1;
    return value;
  }

  private whitespace(): void {
    while (this.peek() === " " || this.peek() === "\t" || this.peek() === "\n" || this.peek() === "\r") {
      this.position += 1;
    }
  }

  private nextIsDigit(): boolean {
    const value = this.peek();
    return value !== undefined && value >= "0" && value <= "9";
  }

  private countValue(depth: number): void {
    this.values += 1;
    if (depth > MAX_DEPTH || this.values > MAX_VALUES) throw new JsonSyntaxFailure(false);
  }

  private value(depth: number): ReadonlyJsonValue {
    this.countValue(depth);
    const next = this.peek();
    if (next === undefined) throw new JsonSyntaxFailure(true);
    if (next === "{") return this.object(depth + 1);
    if (next === "[") return this.array(depth + 1);
    if (next === '"') return this.string();
    if (next === "t") return this.keyword("true", true);
    if (next === "f") return this.keyword("false", false);
    if (next === "n") return this.keyword("null", null);
    if (next === "-" || (next >= "0" && next <= "9")) return this.number();
    throw new JsonSyntaxFailure(false);
  }

  private object(depth: number): ReadonlyJsonObject {
    if (depth > MAX_DEPTH) throw new JsonSyntaxFailure(false);
    this.take("{");
    this.whitespace();
    const output: Record<string, ReadonlyJsonValue> = Object.create(null);
    const exactKeys = new Set<string>();
    const normalizedKeys = new Set<string>();
    if (this.peek() === "}") {
      this.take();
      return output;
    }
    while (true) {
      if (this.peek() !== '"') throw new JsonSyntaxFailure(this.atEnd());
      const key = this.string();
      const normalized = key.normalize("NFC");
      if (
        key === "__proto__" || key === "prototype" || key === "constructor" ||
        exactKeys.has(key) || normalizedKeys.has(normalized)
      ) throw new JsonSyntaxFailure(false);
      exactKeys.add(key);
      normalizedKeys.add(normalized);
      this.members += 1;
      if (this.members > MAX_MEMBERS) throw new JsonSyntaxFailure(false);
      this.whitespace();
      this.take(":");
      this.whitespace();
      output[key] = this.value(depth);
      this.whitespace();
      const separator = this.take();
      if (separator === "}") return output;
      if (separator !== ",") throw new JsonSyntaxFailure(false);
      this.whitespace();
      if (this.peek() === "}") throw new JsonSyntaxFailure(false);
    }
  }

  private array(depth: number): readonly ReadonlyJsonValue[] {
    if (depth > MAX_DEPTH) throw new JsonSyntaxFailure(false);
    this.take("[");
    this.whitespace();
    const output: ReadonlyJsonValue[] = [];
    if (this.peek() === "]") {
      this.take();
      return output;
    }
    while (true) {
      this.arrayEntries += 1;
      if (this.arrayEntries > MAX_ARRAY_ENTRIES) throw new JsonSyntaxFailure(false);
      output.push(this.value(depth));
      this.whitespace();
      const separator = this.take();
      if (separator === "]") return output;
      if (separator !== ",") throw new JsonSyntaxFailure(false);
      this.whitespace();
      if (this.peek() === "]") throw new JsonSyntaxFailure(false);
    }
  }

  private string(): string {
    this.take('"');
    let output = "";
    while (true) {
      const character = this.take();
      if (character === '"') return output;
      if (character === "\\") {
        const escape = this.take();
        switch (escape) {
          case '"': output += '"'; break;
          case "\\": output += "\\"; break;
          case "/": output += "/"; break;
          case "b": output += "\b"; break;
          case "f": output += "\f"; break;
          case "n": output += "\n"; break;
          case "r": output += "\r"; break;
          case "t": output += "\t"; break;
          case "u": output += this.unicodeEscape(); break;
          default: throw new JsonSyntaxFailure(false);
        }
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) throw new JsonSyntaxFailure(false);
      if (character.charCodeAt(0) >= 0xd800 && character.charCodeAt(0) <= 0xdfff) {
        const next = this.take();
        if (
          character.charCodeAt(0) > 0xdbff ||
          next.charCodeAt(0) < 0xdc00 || next.charCodeAt(0) > 0xdfff
        ) throw new JsonSyntaxFailure(false);
        output += character + next;
      } else output += character;
    }
  }

  private unicodeEscape(): string {
    const first = this.hexUnit();
    if (first >= 0xd800 && first <= 0xdbff) {
      this.take("\\");
      this.take("u");
      const second = this.hexUnit();
      if (second < 0xdc00 || second > 0xdfff) throw new JsonSyntaxFailure(false);
      return String.fromCharCode(first, second);
    }
    if (first >= 0xdc00 && first <= 0xdfff) throw new JsonSyntaxFailure(false);
    return String.fromCharCode(first);
  }

  private hexUnit(): number {
    let hex = "";
    for (let index = 0; index < 4; index += 1) {
      const value = this.take();
      if (!/[0-9a-fA-F]/.test(value)) throw new JsonSyntaxFailure(false);
      hex += value;
    }
    return Number.parseInt(hex, 16);
  }

  private keyword<T extends boolean | null>(word: string, value: T): T {
    for (const expected of word) this.take(expected);
    return value;
  }

  private number(): number {
    const start = this.position;
    if (this.peek() === "-") this.take();
    if (this.peek() === "0") {
      this.take();
      const next = this.peek();
      if (next !== undefined && next >= "0" && next <= "9") throw new JsonSyntaxFailure(false);
    } else {
      const first = this.peek();
      if (first === undefined) throw new JsonSyntaxFailure(true);
      if (first < "1" || first > "9") throw new JsonSyntaxFailure(false);
      while (this.nextIsDigit()) this.take();
    }
    if (this.peek() === ".") {
      this.take();
      const first = this.peek();
      if (first === undefined) throw new JsonSyntaxFailure(true);
      if (first < "0" || first > "9") throw new JsonSyntaxFailure(false);
      while (this.nextIsDigit()) this.take();
    }
    if (this.peek() === "e" || this.peek() === "E") {
      this.take();
      if (this.peek() === "+" || this.peek() === "-") this.take();
      const first = this.peek();
      if (first === undefined) throw new JsonSyntaxFailure(true);
      if (first < "0" || first > "9") throw new JsonSyntaxFailure(false);
      while (this.nextIsDigit()) this.take();
    }
    const value = Number(this.text.slice(start, this.position));
    if (!Number.isFinite(value)) throw new JsonSyntaxFailure(false);
    return value;
  }
}

export function parseOneJsonObjectV1(
  outputText: unknown,
): AiServiceResult<ReadonlyJsonObject> {
  if (typeof outputText !== "string") return aiFailure("output_invalid_json");
  const bytes = Buffer.byteLength(outputText, "utf8");
  if (bytes === 0 || outputText.trim().length === 0) return aiFailure("output_empty");
  if (bytes > MAX_BYTES) return aiFailure("output_too_large");
  if (
    outputText.charCodeAt(0) === 0xfeff || outputText.includes("\0") ||
    outputText.includes("\uFFFD") || hasLoneSurrogate(outputText)
  ) return aiFailure("output_invalid_json");
  try {
    return aiSuccess(new BoundedJsonParser(outputText).parseRoot());
  } catch (error) {
    return aiFailure(
      error instanceof JsonSyntaxFailure && error.truncated
        ? "output_truncated" : "output_invalid_json",
    );
  }
}
