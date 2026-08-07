import { SaxesParser, type SaxesAttributeNS } from "saxes";
import { describe, expect, it } from "vitest";

import { PRODUCT_IMPORT_LIMITS } from "./contract";
import {
  WorkbookXmlResourceBudget,
  WorkbookXmlResourceMeter,
  type WorkbookXmlResourceSnapshot,
} from "./workbook-xml-resource-meter";

const encoder = new TextEncoder();

class MeterFailure extends Error {}

function reject(message: string): never {
  throw new MeterFailure(message);
}

function xml(value: string): Uint8Array {
  return encoder.encode(value);
}

function utf8Bytes(value: string): number {
  return encoder.encode(value).byteLength;
}

type RunResult = {
  error: unknown;
  forwarded: string[];
  attributes: string[];
  text: string[];
  snapshot: WorkbookXmlResourceSnapshot;
};

function run(parts: readonly (Uint8Array | readonly Uint8Array[])[]): RunResult {
  const budget = new WorkbookXmlResourceBudget(reject);
  const forwarded: string[] = [];
  const attributes: string[] = [];
  const text: string[] = [];
  let error: unknown;

  try {
    for (const part of parts) {
      const parser = new SaxesParser({ xmlns: true });
      const meter = new WorkbookXmlResourceMeter(budget, reject);
      parser.on("attribute", (attribute: SaxesAttributeNS) => attributes.push(attribute.value));
      parser.on("text", (value) => text.push(value));
      parser.on("error", (parserError) => {
        throw parserError;
      });
      const chunks = part instanceof Uint8Array ? [part] : part;
      for (const chunk of chunks) {
        meter.write(chunk, (decoded) => {
          forwarded.push(decoded);
          parser.write(decoded);
        });
      }
      meter.close((decoded) => {
        forwarded.push(decoded);
        parser.write(decoded);
      });
      parser.close();
    }
  } catch (caught) {
    error = caught;
  }

  return { error, forwarded, attributes, text, snapshot: budget.snapshot() };
}

function expectAccepted(result: RunResult): void {
  expect(result.error).toBeUndefined();
}

function expectRejected(result: RunResult, message: RegExp): void {
  expect(result.error).toBeInstanceOf(MeterFailure);
  expect((result.error as Error).message).toMatch(message);
}

function chunksOf(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += size) {
    chunks.push(bytes.subarray(offset, Math.min(offset + size, bytes.byteLength)));
  }
  return chunks;
}

function observedChunks(values: readonly Uint8Array[]): {
  chunks: readonly Uint8Array[];
  reads: () => number;
} {
  let reads = 0;
  const chunks = new Proxy(values, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) reads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  return { chunks, reads: () => reads };
}

function elementsWithAttributes(elements: number): string {
  const attributes = Array.from(
    { length: PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement },
    (_, index) => ` a${index}=""`,
  ).join("");
  return `<r>${`<n${attributes}/>`.repeat(elements)}</r>`;
}

function textRuns(totalBytes: number): string {
  let remaining = totalBytes;
  const runs: string[] = [];
  while (remaining > 0) {
    const size = Math.min(remaining, PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes);
    runs.push(`<n>${"x".repeat(size)}</n>`);
    remaining -= size;
  }
  return `<r>${runs.join("")}</r>`;
}

describe("Workbook XML lexical resource meter", () => {
  it("forwards accepted source unchanged and counts 1/2/3/4-byte UTF-8 code points", () => {
    const source = "<r>A¢€😀</r>";
    const result = run([chunksOf(xml(source), 3)]);

    expectAccepted(result);
    expect(result.forwarded.join("")).toBe(source);
    expect(result.text.join("")).toBe("A¢€😀");
    expect(result.snapshot.decodedTextBytes).toBe(10);
  });

  it("preserves a four-byte code point split after bytes one, two, and three", () => {
    const result = run([[xml("<r>"), ...chunksOf(xml("😀"), 1), xml("</r>")]]);

    expectAccepted(result);
    expect(result.forwarded.join("")).toBe("<r>😀</r>");
    expect(result.text.join("")).toBe("😀");
    expect(result.snapshot.decodedTextBytes).toBe(4);
  });

  it("enforces an attribute edge containing a four-byte code point before forwarding +1", () => {
    const exact = run([[xml('<r a="'), xml(`${"x".repeat(4_092)}😀`), xml('"/>')]]);
    const above = run([[xml('<r a="'), xml(`${"x".repeat(4_093)}😀`), xml('"/>')]]);

    expectAccepted(exact);
    expect(utf8Bytes(exact.attributes[0]!)).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes);
    expectRejected(above, /attribute value exceeds/i);
    expect(above.forwarded.join("")).toBe('<r a="');
    expect(above.attributes).toEqual([]);
  });

  it("counts five predefined and numeric entities without changing their source", () => {
    const source = "<r>&amp;&lt;&gt;&quot;&apos;&#65;&#x1F600;</r>";
    const semanticValue = `&<>"'A😀`;
    const result = run([xml(source)]);

    expectAccepted(result);
    expect(result.forwarded.join("")).toBe(source);
    expect(result.text.join("")).toBe(semanticValue);
    expect(result.snapshot.decodedTextBytes).toBe(utf8Bytes(semanticValue));
  });

  it("accepts arbitrary decimal and hexadecimal leading zeros across a 64 KiB scan boundary", () => {
    const zeros = "0".repeat(96 * 1024);
    for (const reference of [`&#${zeros}65;`, `&#x${zeros}41;`]) {
      const source = `<r>${reference}</r>`;
      const result = run([xml(source)]);

      expectAccepted(result);
      expect(result.forwarded.join("")).toBe(source);
      expect(result.forwarded.length).toBeGreaterThan(1);
      expect(Math.max(...result.forwarded.map(utf8Bytes))).toBeLessThanOrEqual(64 * 1024);
      expect(result.text.join("")).toBe("A");
      expect(result.snapshot.decodedTextBytes).toBe(1);
    }
  });

  it("withholds an entity-closing subchunk that would exceed a logical text run", () => {
    const observed = observedChunks([
      xml("<r>"),
      xml("x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)),
      xml("&#65"),
      xml(";"),
      xml("</r>"),
    ]);
    const result = run([observed.chunks]);

    expectRejected(result, /logical text run exceeds/i);
    expect(observed.reads()).toBe(4);
    expect(result.forwarded.join("")).toBe(
      `<r>${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)}&#65`,
    );
    expect(result.text).toEqual([]);
  });

  it("never lets saxes construct a plain logical text run above 32 KiB", () => {
    const exactText = "x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes);
    const exact = run([[xml("<r>"), xml(exactText), xml("</r>")]]);
    const observed = observedChunks([xml("<r>"), xml(exactText), xml("x"), xml("</r>")]);
    const above = run([observed.chunks]);

    expectAccepted(exact);
    expect(exact.text).toEqual([exactText]);
    expectRejected(above, /logical text run exceeds/i);
    expect(observed.reads()).toBe(3);
    expect(above.forwarded.join("")).toBe(`<r>${exactText}`);
    expect(above.text).toEqual([]);
  });

  it("matches saxes attribute normalization across literal and numeric whitespace", () => {
    const normalizedTail = "    \t\n\r \n\r ";
    const sourceTail = "\t\n\r\r\n&#9;&#10;&#13;\r&#10;&#13;\n";
    const padding = "x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes - utf8Bytes(normalizedTail));
    const exact = run([[xml(`<r a='${padding}\t\n\r\r`), xml("\n&#9;&#10;&#13;\r&#10;&#13;\n'/>")]]);
    const above = run([[xml(`<r a='x${padding}${sourceTail}'/>`)]]);

    expectAccepted(exact);
    expect(exact.attributes).toEqual([`${padding}${normalizedTail}`]);
    expect(utf8Bytes(exact.attributes[0]!)).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes);
    expectRejected(above, /attribute value exceeds/i);
    expect(above.attributes).toEqual([]);
  });

  it("keeps shared element totals across parts", () => {
    const half = PRODUCT_IMPORT_LIMITS.workbookXmlNodes / 2;
    const part = xml(`<r>${"<n/>".repeat(half - 1)}</r>`);
    const exact = run([part, part]);
    const above = run([part, part, xml("<r/>")]);

    expectAccepted(exact);
    expect(exact.snapshot.elements).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlNodes);
    expectRejected(above, /element count exceeds/i);
  });

  it("keeps shared attribute totals across parts", () => {
    const first = xml(elementsWithAttributes(313));
    const second = xml(elementsWithAttributes(312));
    const exact = run([first, second]);
    const above = run([first, second, xml('<r a=""/>')]);

    expectAccepted(exact);
    expect(exact.snapshot.attributes).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlAttributes);
    expectRejected(above, /attribute count exceeds/i);
  });

  it("keeps shared decoded-text totals across parts", () => {
    const half = PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes / 2;
    const first = xml(textRuns(half));
    const second = xml(textRuns(half));
    const exact = run([first, second]);
    const above = run([first, second, xml("<r>x</r>")]);

    expectAccepted(exact);
    expect(exact.snapshot.decodedTextBytes).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes);
    expectRejected(above, /decoded text exceeds/i);
  });

  it("rejects source +1 before decode or forwarding and leaves the sentinel unrequested", () => {
    const budget = new WorkbookXmlResourceBudget(reject);
    budget.addSource(PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes);
    const meter = new WorkbookXmlResourceMeter(budget, reject);
    const observed = observedChunks([xml(" "), xml("<sentinel/>")]);
    const forwarded: string[] = [];
    let error: unknown;

    try {
      for (const chunk of observed.chunks) meter.write(chunk, (decoded) => forwarded.push(decoded));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(MeterFailure);
    expect((error as Error).message).toMatch(/source bytes exceed/i);
    expect(observed.reads()).toBe(1);
    expect(forwarded).toEqual([]);
    expect(budget.snapshot().sourceBytes).toBe(PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes);
  });

  it("accepts source split into 1, 2, 3, and 1,024-byte chunks", () => {
    const source = xml("<r>A¢€😀&amp;</r>");
    for (const size of [1, 2, 3, 1_024]) {
      const result = run([chunksOf(source, size)]);
      expectAccepted(result);
      expect(result.forwarded.join("")).toBe("<r>A¢€😀&amp;</r>");
    }
  });

  it.each([
    ["unknown named entity", "<r>&bogus;</r>"],
    ["numeric overflow", "<r>&#1114112;</r>"],
    ["illegal XML code point", "<r>&#0;</r>"],
    ["illegal numeric digit", "<r>&#xG;</r>"],
    ["missing semicolon", "<r>&#65"],
  ])("fails closed for %s", (_label, source) => {
    expectRejected(run([xml(source)]), /topology or namespace is invalid/i);
  });
});
