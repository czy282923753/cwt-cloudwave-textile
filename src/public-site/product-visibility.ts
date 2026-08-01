export interface ProductVisibilityInput {
  composition: string | null;
  weightGsm: string | null;
  widthCm: string | null;
  colorOptions: string | null;
  customAvailable: "unknown" | "yes" | "no";
  sampleAvailable: "unknown" | "yes" | "no";
  moqNote: string | null;
  colorOptionsDisplay: "inherit" | "show" | "hide";
  customAvailableDisplay: "inherit" | "show" | "hide";
  sampleAvailableDisplay: "inherit" | "show" | "hide";
  moqNoteDisplay: "inherit" | "show" | "hide";
}

export function resolveVisibleProductFields(
  product: ProductVisibilityInput,
  verifiedFields: ReadonlySet<string>,
) {
  return {
    composition: verifiedFields.has("composition") ? product.composition : null,
    weightGsm: verifiedFields.has("weightGsm") ? product.weightGsm : null,
    widthCm: verifiedFields.has("widthCm") ? product.widthCm : null,
    colorOptions:
      product.colorOptionsDisplay === "show" ? product.colorOptions : null,
    customAvailable:
      product.customAvailableDisplay === "show" ? product.customAvailable : null,
    sampleAvailable:
      product.sampleAvailableDisplay === "show" ? product.sampleAvailable : null,
    moqNote: product.moqNoteDisplay === "show" ? product.moqNote : null,
  };
}
