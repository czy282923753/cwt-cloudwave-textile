import { PRODUCT_IMPORT_LIMITS } from "./contract";

const scanSubchunkBytes = 64 * 1024;
const maximumXmlCodePoint = 0x10ffff;
const saturatedCodePoint = maximumXmlCodePoint + 1;

type Reject = (message: string) => never;
type EntityContext = "attribute" | "text";
type EntityKind = "after-ampersand" | "named" | "numeric";
type LexicalMode =
  | "text"
  | "less-than"
  | "start-tag-name"
  | "between-attributes"
  | "attribute-name"
  | "after-attribute-name"
  | "before-attribute-value"
  | "attribute-value"
  | "empty-element-close"
  | "end-tag-name"
  | "after-end-tag-name"
  | "processing-instruction";

const predefinedEntities = [
  { name: "amp", codePoint: 0x26 },
  { name: "lt", codePoint: 0x3c },
  { name: "gt", codePoint: 0x3e },
  { name: "quot", codePoint: 0x22 },
  { name: "apos", codePoint: 0x27 },
] as const;
const allPredefinedEntityCandidates = (1 << predefinedEntities.length) - 1;

export type WorkbookXmlResourceSnapshot = Readonly<{
  elements: number;
  attributes: number;
  decodedTextBytes: number;
  sourceBytes: number;
}>;

export class WorkbookXmlResourceBudget {
  private elements = 0;
  private attributes = 0;
  private decodedTextBytes = 0;
  private sourceBytes = 0;

  constructor(private readonly reject: Reject) {}

  addSource(bytes: number): void {
    const next = this.sourceBytes + bytes;
    if (next > PRODUCT_IMPORT_LIMITS.workbookXmlSourceBytes) {
      this.reject("Workbook XML source bytes exceed the Template V1 limit.");
    }
    this.sourceBytes = next;
  }

  startElement(depth: number): void {
    const next = this.elements + 1;
    if (next > PRODUCT_IMPORT_LIMITS.workbookXmlNodes) {
      this.reject("Workbook XML element count exceeds the Template V1 limit.");
    }
    if (depth > PRODUCT_IMPORT_LIMITS.workbookXmlDepth) {
      this.reject("Workbook XML depth exceeds the Template V1 limit.");
    }
    this.elements = next;
  }

  addAttribute(elementAttributes: number): void {
    if (elementAttributes > PRODUCT_IMPORT_LIMITS.workbookXmlAttributesPerElement) {
      this.reject("Workbook XML attributes per element exceed the Template V1 limit.");
    }
    const next = this.attributes + 1;
    if (next > PRODUCT_IMPORT_LIMITS.workbookXmlAttributes) {
      this.reject("Workbook XML attribute count exceeds the Template V1 limit.");
    }
    this.attributes = next;
  }

  addAttributeValue(currentBytes: number, bytes: number): number {
    const next = currentBytes + bytes;
    if (next > PRODUCT_IMPORT_LIMITS.workbookXmlAttributeValueBytes) {
      this.reject("Workbook XML attribute value exceeds the Template V1 limit.");
    }
    return next;
  }

  addText(currentRunBytes: number, bytes: number): number {
    const nextRun = currentRunBytes + bytes;
    if (nextRun > PRODUCT_IMPORT_LIMITS.workbookXmlTextSegmentBytes) {
      this.reject("Workbook XML logical text run exceeds the Template V1 limit.");
    }
    const nextTotal = this.decodedTextBytes + bytes;
    if (nextTotal > PRODUCT_IMPORT_LIMITS.workbookXmlTextBytes) {
      this.reject("Workbook XML decoded text exceeds the Template V1 limit.");
    }
    this.decodedTextBytes = nextTotal;
    return nextRun;
  }

  snapshot(): WorkbookXmlResourceSnapshot {
    return {
      elements: this.elements,
      attributes: this.attributes,
      decodedTextBytes: this.decodedTextBytes,
      sourceBytes: this.sourceBytes,
    };
  }
}

function isWhitespace(value: string): boolean {
  return value === " " || value === "\t" || value === "\n" || value === "\r";
}

function utf8CodePointBytes(value: number): number {
  if (value <= 0x7f) return 1;
  if (value <= 0x7ff) return 2;
  if (value <= 0xffff) return 3;
  return 4;
}

function isXmlCodePoint(value: number): boolean {
  return (
    value === 0x9 ||
    value === 0xa ||
    value === 0xd ||
    (value >= 0x20 && value <= 0xd7ff) ||
    (value >= 0xe000 && value <= 0xfffd) ||
    (value >= 0x10000 && value <= maximumXmlCodePoint)
  );
}

function digitValue(value: string, radix: number): number {
  const codePoint = value.codePointAt(0) ?? -1;
  if (codePoint >= 0x30 && codePoint <= 0x39) return codePoint - 0x30;
  if (radix === 16 && codePoint >= 0x41 && codePoint <= 0x46) return codePoint - 0x41 + 10;
  if (radix === 16 && codePoint >= 0x61 && codePoint <= 0x66) return codePoint - 0x61 + 10;
  return -1;
}

export class WorkbookXmlResourceMeter {
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private mode: LexicalMode = "text";
  private depth = 0;
  private elementAttributes = 0;
  private attributeValueBytes = 0;
  private logicalTextRunBytes = 0;
  private attributeQuote: "\"" | "'" | null = null;
  private previousLiteralCr = false;
  private processingInstructionQuestion = false;
  private entityContext: EntityContext | null = null;
  private entityKind: EntityKind | null = null;
  private entityCandidateMask = 0;
  private entityPosition = 0;
  private numericRadix = 10;
  private numericSawDigit = false;
  private numericMayUseHexMarker = false;
  private numericValue = 0;
  private numericInvalid = false;
  private closed = false;

  constructor(
    private readonly budget: WorkbookXmlResourceBudget,
    private readonly reject: Reject,
  ) {}

  write(bytes: Uint8Array, forward: (decoded: string) => void): void {
    if (this.closed) this.reject("Workbook package XML parser received data after close.");
    this.budget.addSource(bytes.byteLength);
    for (let offset = 0; offset < bytes.byteLength; offset += scanSubchunkBytes) {
      const subchunk = bytes.subarray(offset, Math.min(offset + scanSubchunkBytes, bytes.byteLength));
      const decoded = this.decode(subchunk, true);
      if (!decoded) continue;
      this.scan(decoded);
      forward(decoded);
    }
  }

  close(forward: (decoded: string) => void): void {
    if (this.closed) this.reject("Workbook package XML parser was closed more than once.");
    this.closed = true;
    const decoded = this.decode(undefined, false);
    if (decoded) {
      this.scan(decoded);
      forward(decoded);
    }
    if (this.mode !== "text" || this.depth !== 0 || this.entityKind !== null) {
      this.reject("Workbook package XML topology or namespace is invalid.");
    }
  }

  private decode(bytes: Uint8Array | undefined, stream: boolean): string {
    try {
      return bytes === undefined ? this.decoder.decode() : this.decoder.decode(bytes, { stream });
    } catch {
      this.reject("Workbook package XML is not valid UTF-8.");
    }
  }

  private scan(decoded: string): void {
    for (const value of decoded) this.scanCodePoint(value);
  }

  private scanCodePoint(value: string): void {
    if (this.entityKind !== null) {
      this.scanEntity(value);
      return;
    }

    switch (this.mode) {
      case "text":
        this.scanText(value);
        return;
      case "less-than":
        this.scanAfterLessThan(value);
        return;
      case "start-tag-name":
        this.scanStartTagName(value);
        return;
      case "between-attributes":
        this.scanBetweenAttributes(value);
        return;
      case "attribute-name":
        this.scanAttributeName(value);
        return;
      case "after-attribute-name":
        this.scanAfterAttributeName(value);
        return;
      case "before-attribute-value":
        this.scanBeforeAttributeValue(value);
        return;
      case "attribute-value":
        this.scanAttributeValue(value);
        return;
      case "empty-element-close":
        if (value !== ">") this.reject("Workbook package XML topology or namespace is invalid.");
        this.closeElement();
        return;
      case "end-tag-name":
        if (value === ">") {
          this.closeElement();
        } else if (isWhitespace(value)) {
          this.mode = "after-end-tag-name";
        }
        return;
      case "after-end-tag-name":
        if (value === ">") {
          this.closeElement();
        } else if (!isWhitespace(value)) {
          this.reject("Workbook package XML topology or namespace is invalid.");
        }
        return;
      case "processing-instruction":
        if (value === ">" && this.processingInstructionQuestion) {
          this.mode = "text";
          this.processingInstructionQuestion = false;
        } else {
          this.processingInstructionQuestion = value === "?";
        }
    }
  }

  private scanText(value: string): void {
    if (value === "<") {
      this.previousLiteralCr = false;
      this.mode = "less-than";
      return;
    }
    if (value === "&") {
      this.previousLiteralCr = false;
      this.startEntity("text");
      return;
    }
    this.countLiteral(value, "text");
  }

  private scanAfterLessThan(value: string): void {
    if (value === "/") {
      this.resetLogicalTextRun();
      this.mode = "end-tag-name";
      return;
    }
    if (value === "?") {
      this.processingInstructionQuestion = false;
      this.mode = "processing-instruction";
      return;
    }
    if (value === "!") {
      this.reject("Workbook package XML contains unsupported DTD or entity declarations.");
    }
    this.resetLogicalTextRun();
    this.depth += 1;
    this.budget.startElement(this.depth);
    this.elementAttributes = 0;
    this.mode = "start-tag-name";
  }

  private scanStartTagName(value: string): void {
    if (value === ">") {
      this.mode = "text";
    } else if (value === "/") {
      this.mode = "empty-element-close";
    } else if (isWhitespace(value)) {
      this.mode = "between-attributes";
    }
  }

  private scanBetweenAttributes(value: string): void {
    if (isWhitespace(value)) return;
    if (value === ">") {
      this.mode = "text";
      return;
    }
    if (value === "/") {
      this.mode = "empty-element-close";
      return;
    }
    this.elementAttributes += 1;
    this.budget.addAttribute(this.elementAttributes);
    this.mode = "attribute-name";
  }

  private scanAttributeName(value: string): void {
    if (value === "=") {
      this.mode = "before-attribute-value";
    } else if (isWhitespace(value)) {
      this.mode = "after-attribute-name";
    } else if (value === ">" || value === "/") {
      this.reject("Workbook package XML topology or namespace is invalid.");
    }
  }

  private scanAfterAttributeName(value: string): void {
    if (isWhitespace(value)) return;
    if (value !== "=") this.reject("Workbook package XML topology or namespace is invalid.");
    this.mode = "before-attribute-value";
  }

  private scanBeforeAttributeValue(value: string): void {
    if (isWhitespace(value)) return;
    if (value !== "\"" && value !== "'") {
      this.reject("Workbook package XML topology or namespace is invalid.");
    }
    this.attributeQuote = value;
    this.attributeValueBytes = 0;
    this.previousLiteralCr = false;
    this.mode = "attribute-value";
  }

  private scanAttributeValue(value: string): void {
    if (value === this.attributeQuote) {
      this.attributeQuote = null;
      this.previousLiteralCr = false;
      this.mode = "between-attributes";
      return;
    }
    if (value === "<") this.reject("Workbook package XML topology or namespace is invalid.");
    if (value === "&") {
      this.previousLiteralCr = false;
      this.startEntity("attribute");
      return;
    }
    this.countLiteral(value, "attribute");
  }

  private countLiteral(value: string, context: EntityContext): void {
    if (value === "\n" && this.previousLiteralCr) {
      this.previousLiteralCr = false;
      return;
    }
    const isCr = value === "\r";
    this.previousLiteralCr = isCr;
    const bytes =
      context === "attribute" && (value === "\t" || value === "\n" || isCr)
        ? 1
        : utf8CodePointBytes(value.codePointAt(0)!);
    this.countDecoded(bytes, context);
  }

  private startEntity(context: EntityContext): void {
    this.entityContext = context;
    this.entityKind = "after-ampersand";
    this.entityCandidateMask = allPredefinedEntityCandidates;
    this.entityPosition = 0;
    this.numericRadix = 10;
    this.numericSawDigit = false;
    this.numericMayUseHexMarker = false;
    this.numericValue = 0;
    this.numericInvalid = false;
  }

  private scanEntity(value: string): void {
    if (this.entityKind === "after-ampersand") {
      if (value === "#") {
        this.entityKind = "numeric";
        this.numericMayUseHexMarker = true;
        return;
      }
      this.entityKind = "named";
    }

    if (this.entityKind === "named") {
      this.scanNamedEntity(value);
      return;
    }
    this.scanNumericEntity(value);
  }

  private scanNamedEntity(value: string): void {
    if (value === ";") {
      let matchedCodePoint: number | null = null;
      for (let index = 0; index < predefinedEntities.length; index += 1) {
        const candidate = predefinedEntities[index]!;
        if ((this.entityCandidateMask & (1 << index)) !== 0 && candidate.name.length === this.entityPosition) {
          matchedCodePoint = candidate.codePoint;
          break;
        }
      }
      if (matchedCodePoint === null) this.reject("Workbook package XML topology or namespace is invalid.");
      this.finishEntity(matchedCodePoint);
      return;
    }

    let nextMask = 0;
    for (let index = 0; index < predefinedEntities.length; index += 1) {
      const candidate = predefinedEntities[index]!;
      if (
        (this.entityCandidateMask & (1 << index)) !== 0 &&
        candidate.name[this.entityPosition] === value
      ) {
        nextMask |= 1 << index;
      }
    }
    if (nextMask === 0) this.reject("Workbook package XML topology or namespace is invalid.");
    this.entityCandidateMask = nextMask;
    this.entityPosition += 1;
  }

  private scanNumericEntity(value: string): void {
    if (value === ";") {
      if (!this.numericSawDigit || this.numericInvalid || !isXmlCodePoint(this.numericValue)) {
        this.reject("Workbook package XML topology or namespace is invalid.");
      }
      this.finishEntity(this.numericValue);
      return;
    }
    if (value === "x" && this.numericMayUseHexMarker && !this.numericSawDigit) {
      this.numericRadix = 16;
      this.numericMayUseHexMarker = false;
      return;
    }
    this.numericMayUseHexMarker = false;
    const digit = digitValue(value, this.numericRadix);
    if (digit < 0 || digit >= this.numericRadix) {
      this.reject("Workbook package XML topology or namespace is invalid.");
    }
    this.numericSawDigit = true;
    if (
      this.numericInvalid ||
      this.numericValue > Math.floor((maximumXmlCodePoint - digit) / this.numericRadix)
    ) {
      this.numericInvalid = true;
      this.numericValue = saturatedCodePoint;
      return;
    }
    this.numericValue = this.numericValue * this.numericRadix + digit;
  }

  private finishEntity(codePoint: number): void {
    const context = this.entityContext;
    if (context === null) this.reject("Workbook package XML topology or namespace is invalid.");
    this.countDecoded(utf8CodePointBytes(codePoint), context);
    this.entityContext = null;
    this.entityKind = null;
    this.entityCandidateMask = 0;
    this.entityPosition = 0;
    this.numericValue = 0;
    this.numericInvalid = false;
  }

  private countDecoded(bytes: number, context: EntityContext): void {
    if (context === "attribute") {
      this.attributeValueBytes = this.budget.addAttributeValue(this.attributeValueBytes, bytes);
    } else {
      this.logicalTextRunBytes = this.budget.addText(this.logicalTextRunBytes, bytes);
    }
  }

  private resetLogicalTextRun(): void {
    this.logicalTextRunBytes = 0;
    this.previousLiteralCr = false;
  }

  private closeElement(): void {
    this.depth -= 1;
    if (this.depth < 0) this.reject("Workbook package XML topology or namespace is invalid.");
    this.resetLogicalTextRun();
    this.mode = "text";
  }
}
