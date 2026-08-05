import { z } from "zod";

export const MOQ_UNITS = ["m", "kg", "roll", "yd"] as const;
export type MoqUnit = (typeof MOQ_UNITS)[number];

export const productCodePrefixSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3,8}$/, "Product Code prefix must use 3–8 uppercase ASCII letters.");

export function normalizeProductCodePrefix(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return productCodePrefixSchema.parse(value.trim().toUpperCase());
}

export function formatGeneratedProductCode(prefix: string, sequence: number): string {
  const normalizedPrefix = productCodePrefixSchema.parse(prefix);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new Error("Product Code sequence must be an integer from 1 through 999.");
  }
  return `CWT-${normalizedPrefix}-${String(sequence).padStart(3, "0")}`;
}

export function normalizeAssignedProductCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized) || normalized.length > 64) {
    throw new Error(
      "Product Code must use uppercase ASCII letters, numbers, and single hyphen separators.",
    );
  }
  return normalized;
}

export function nextGeneratedProductCode(prefix: string, existingCodes: readonly string[]): string {
  const normalizedPrefix = productCodePrefixSchema.parse(prefix);
  const pattern = new RegExp(`^CWT-${normalizedPrefix}-(\\d{3})$`);
  let maximum = 0;
  for (const code of existingCodes) {
    const match = pattern.exec(code);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }
  return formatGeneratedProductCode(normalizedPrefix, maximum + 1);
}

export function normalizeComposition(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const rawParts = value.trim().split(/\s*\/\s*/);
  if (rawParts.length > 12) throw new Error("Composition contains too many components.");
  const normalizedParts = rawParts.map((part) => {
    const match = /^(\d+(?:\.\d{1,2})?)\s*%\s+(.+)$/.exec(part.trim());
    if (!match) {
      throw new Error(
        "Composition must use entries such as '100% Polyester' or '92% Polyester / 8% Spandex'.",
      );
    }
    const percentage = Number(match[1]);
    if (!(percentage > 0 && percentage <= 100)) {
      throw new Error("Each Composition percentage must be greater than 0 and at most 100.");
    }
    const material = match[2]!.trim().replaceAll(/\s+/g, " ");
    if (!/^[A-Za-z][A-Za-z0-9 ()&.+-]{0,79}$/.test(material)) {
      throw new Error("Composition material names must use approved plain-text characters.");
    }
    return `${match[1]}% ${material}`;
  });
  return normalizedParts.join(" / ");
}

export function normalizePositiveDecimal(
  value: string | null | undefined,
  label: string,
): string | null {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error(`${label} must be a positive number with at most two decimal places.`);
  }
  return normalized;
}

export function normalizeMoq(
  value: string | null | undefined,
  unit: string | null | undefined,
): { moqValue: string | null; moqUnit: MoqUnit | null } {
  const moqValue = normalizePositiveDecimal(value, "MOQ Value");
  const moqUnit = unit?.trim() ? z.enum(MOQ_UNITS).parse(unit.trim()) : null;
  if ((moqValue === null) !== (moqUnit === null)) {
    throw new Error("MOQ Value and MOQ Unit must be supplied or cleared together.");
  }
  return { moqValue, moqUnit };
}

export function normalizeProductName(value: string): string {
  const name = value.trim().replaceAll(/\s+/g, " ");
  if (!name || name.length > 200) throw new Error("Product Name must contain 1–200 characters.");
  if (/[<>\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("Product Name may not contain markup or control characters.");
  }
  return name;
}
