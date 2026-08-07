import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PRODUCT_IMPORT_LIMITS } from "./contract";
import { parseWorkbookXmlResourceFixture, WorkbookPackageParseError } from "./workbook-xml";

const encoder = new TextEncoder();

function xml(value: string): Uint8Array {
  return encoder.encode(value);
}

function nested(depth: number): Uint8Array {
  return xml(`${"<n>".repeat(depth)}${"</n>".repeat(depth)}`);
}

function nodes(total: number): Uint8Array {
  return xml(`<r>${"<n/>".repeat(total - 1)}</r>`);
}

function attributesOnOneElement(total: number, includeNamespace = false): Uint8Array {
  const attributes = Array.from({ length: total }, (_, index) =>
    includeNamespace && index === 0 ? ' xmlns:x="urn:synthetic"' : ` a${index}=""`,
  ).join("");
  return xml(`<r${attributes}/>`);
}

function totalAttributes(total: number): Uint8Array {
  let remaining = total;
  let element = 0;
  const children: string[] = [];
  while (remaining) {
    const count = Math.min(remaining, PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement);
    const attributes = Array.from({ length: count }, (_, index) => ` a${index}=""`).join("");
    children.push(`<n${attributes}/>`);
    remaining -= count;
    element += 1;
  }
  return xml(`<r data-elements="${element}">${children.join("")}</r>`);
}

function attributeValue(bytes: number): Uint8Array {
  return xml(`<r a="${"x".repeat(bytes)}"/>`);
}

function chunkedTextRun(bytes: number): Uint8Array[] {
  const chunks = [xml("<r>")];
  let remaining = bytes;
  while (remaining) {
    const size = Math.min(remaining, 1_024);
    chunks.push(xml("x".repeat(size)));
    remaining -= size;
  }
  chunks.push(xml("</r>"));
  return chunks;
}

function totalText(bytes: number): Uint8Array {
  let remaining = bytes;
  const runs: string[] = [];
  while (remaining) {
    const size = Math.min(remaining, PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes);
    runs.push(`<n>${"x".repeat(size)}</n>`);
    remaining -= size;
  }
  return xml(`<r>${runs.join("")}</r>`);
}

function exactDocumentBytes(size: number): Uint8Array {
  if (size < 4) throw new Error("Synthetic XML document is too small.");
  const payload = size - 4;
  for (let count = 0; count <= PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement; count += 1) {
    const prefixes = Array.from({ length: count }, (_, index) => ` a${index}="`);
    const overhead = prefixes.reduce((total, prefix) => total + prefix.length + 1, 0);
    if (overhead > payload || payload > overhead + count * PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes) continue;
    let remaining = payload - overhead;
    const attributes = prefixes.map((prefix) => {
      const valueBytes = Math.min(remaining, PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes);
      remaining -= valueBytes;
      return `${prefix}${"x".repeat(valueBytes)}"`;
    });
    if (remaining !== 0) continue;
    const result = xml(`<r${attributes.join("")}/>`);
    if (result.byteLength !== size) throw new Error("Synthetic XML source sizing failed.");
    return result;
  }
  throw new Error(`Could not construct ${size} bytes of bounded XML.`);
}

function totalSourceBytes(size: number): Uint8Array[] {
  const maximumDocument = exactDocumentBytes(
    4 + Array.from({ length: PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement }, (_, index) =>
      ` a${index}="${"x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes)}"`,
    ).join("").length,
  ).byteLength;
  const parts: Uint8Array[] = [];
  let remaining = size;
  while (remaining > maximumDocument) {
    const nextSize = remaining - maximumDocument < 4 ? remaining - 4 : maximumDocument;
    parts.push(exactDocumentBytes(nextSize));
    remaining -= nextSize;
  }
  if (remaining) parts.push(exactDocumentBytes(remaining));
  return parts;
}

function accept(parts: readonly (Uint8Array | readonly Uint8Array[])[]): void {
  expect(() => parseWorkbookXmlResourceFixture(parts)).not.toThrow();
}

function reject(parts: readonly (Uint8Array | readonly Uint8Array[])[], message: RegExp): void {
  expect(() => parseWorkbookXmlResourceFixture(parts)).toThrow(message);
  try {
    parseWorkbookXmlResourceFixture(parts);
  } catch (error) {
    expect(error).toBeInstanceOf(WorkbookPackageParseError);
  }
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

function rejectAfterChunkReads(
  parts: readonly (Uint8Array | readonly Uint8Array[])[],
  message: RegExp,
  reads: () => number,
  expectedReads: number,
): void {
  let thrown: unknown;
  try {
    parseWorkbookXmlResourceFixture(parts);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(WorkbookPackageParseError);
  expect((thrown as Error).message).toMatch(message);
  expect(reads()).toBe(expectedReads);
}

describe("Template V1 OOXML event-time resource limits", () => {
  it("enforces depth below, exactly at, and above root=1", () => {
    accept([nested(PRODUCT_IMPORT_LIMITS.workbookXmlDepth - 1)]);
    accept([nested(PRODUCT_IMPORT_LIMITS.workbookXmlDepth)]);
    reject([nested(PRODUCT_IMPORT_LIMITS.workbookXmlDepth + 1)], /depth exceeds/i);
  });

  it("enforces total start-elements below, exactly at, and above", () => {
    accept([nodes(PRODUCT_IMPORT_LIMITS.workbookXmlNodes - 1)]);
    accept([nodes(PRODUCT_IMPORT_LIMITS.workbookXmlNodes)]);
    reject([nodes(PRODUCT_IMPORT_LIMITS.workbookXmlNodes + 1)], /element count exceeds/i);
  });

  it("counts namespace declarations and enforces attributes per element below, at, and above", () => {
    accept([attributesOnOneElement(PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement - 1, true)]);
    accept([attributesOnOneElement(PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement, true)]);
    reject([attributesOnOneElement(PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement + 1, true)], /attributes per element exceed/i);
  });

  it("enforces total attributes below, exactly at, and above", () => {
    accept([totalAttributes(PRODUCT_IMPORT_LIMITS.workbookXmlAttributes - 2)]);
    accept([totalAttributes(PRODUCT_IMPORT_LIMITS.workbookXmlAttributes - 1)]);
    reject([totalAttributes(PRODUCT_IMPORT_LIMITS.workbookXmlAttributes)], /attribute count exceeds/i);
  });

  it("enforces one decoded attribute value below, exactly at, and above", () => {
    accept([attributeValue(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes - 1)]);
    accept([attributeValue(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes)]);
    reject([attributeValue(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes + 1)], /attribute value exceeds/i);
  });

  it("enforces one logical text run across callbacks below, exactly at, and above", () => {
    accept([chunkedTextRun(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes - 1)]);
    accept([chunkedTextRun(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)]);
    reject([chunkedTextRun(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes + 1)], /logical text run exceeds/i);
  });

  it("enforces total decoded text below, exactly at, and above", () => {
    accept([totalText(PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes - 1)]);
    accept([totalText(PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes)]);
    reject([totalText(PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes + 1)], /decoded text exceeds/i);
  });

  it("enforces actual decompressed XML source bytes below, exactly at, and above", () => {
    accept(totalSourceBytes(PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes - 1));
    accept(totalSourceBytes(PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes));
    reject(totalSourceBytes(PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes + 1), /source bytes exceed/i);
  });

  it("rejects an attribute-value +1 chunk before pulling its closing source chunk", () => {
    const observed = observedChunks([
      xml('<r a="'),
      xml("x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes + 1)),
      xml('"/>'),
      xml("<sentinel/>"),
    ]);

    rejectAfterChunkReads([observed.chunks], /attribute value exceeds/i, observed.reads, 2);
  });

  it("rejects a logical-text +1 chunk before pulling the closing source chunk", () => {
    const observed = observedChunks([
      xml("<r>"),
      xml("x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)),
      xml("x"),
      xml("</r>"),
      xml("<sentinel/>"),
    ]);

    rejectAfterChunkReads([observed.chunks], /logical text run exceeds/i, observed.reads, 3);
  });

  it("rejects an entity-closing +1 subchunk without pulling the next source chunk", () => {
    const observed = observedChunks([
      xml("<r>"),
      xml("x".repeat(PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes)),
      xml("&#65"),
      xml(";"),
      xml("</r>"),
      xml("<sentinel/>"),
    ]);

    rejectAfterChunkReads([observed.chunks], /logical text run exceeds/i, observed.reads, 4);
  });
});
