import { createHash } from "node:crypto";

export type ImportMediaRole = "hero" | "gallery" | "detail" | "application";

export interface ImportMediaCandidate {
  sourceKey: string;
  relativePath: string;
  sha256: string;
}

export interface MatchedImportMedia extends ImportMediaCandidate {
  role: ImportMediaRole;
  sortOrder: number;
  matchTier: "product_code_folder" | "explicit_file" | "product_code_prefix";
}

function normalized(path: string): string {
  return path.normalize("NFC").replace(/^\.\//, "");
}

function roleForPath(path: string): { role: ImportMediaRole; order: number; explicitPrimary: boolean } {
  const base = path.split("/").at(-1)!.replace(/\.[^.]+$/, "");
  const detail = base.match(/-detail-(\d+)$/i);
  if (detail) return { role: "detail", order: Number(detail[1]), explicitPrimary: false };
  const application = base.match(/-application-(\d+)$/i);
  if (application) return { role: "application", order: Number(application[1]), explicitPrimary: false };
  if (/-main$/i.test(base) || /-01$/i.test(base)) return { role: "hero", order: 0, explicitPrimary: true };
  const numbered = base.match(/-(\d+)$/);
  return { role: "gallery", order: numbered ? Number(numbered[1]) : Number.MAX_SAFE_INTEGER, explicitPrimary: false };
}

export function fingerprintImportMedia(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function matchImportMedia(
  productCode: string,
  explicitFiles: readonly string[],
  candidates: readonly ImportMediaCandidate[],
): { matched: MatchedImportMedia[]; unmatched: ImportMediaCandidate[]; errors: string[] } {
  const code = productCode.toUpperCase();
  const explicit = new Set(explicitFiles.map(normalized));
  const byTier = (candidate: ImportMediaCandidate): MatchedImportMedia["matchTier"] | null => {
    const path = normalized(candidate.relativePath);
    const parts = path.split("/");
    if (parts.length > 1 && parts.at(-2) === code) return "product_code_folder";
    if (explicit.has(path)) return "explicit_file";
    const fileName = parts.at(-1)!.toUpperCase();
    if (fileName.startsWith(code) && ["-", "_", "."].includes(fileName[code.length] ?? "")) return "product_code_prefix";
    return null;
  };
  const selected = candidates.flatMap((candidate) => {
    const tier = byTier(candidate);
    return tier ? [{ candidate, tier }] : [];
  });
  const bestTier = (["product_code_folder", "explicit_file", "product_code_prefix"] as const)
    .find((tier) => selected.some((item) => item.tier === tier));
  const tierItems = bestTier ? selected.filter((item) => item.tier === bestTier) : [];
  const ranked = tierItems.map(({ candidate, tier }) => ({ candidate, tier, ...roleForPath(candidate.relativePath) }))
    .sort((a, b) => a.order - b.order || normalized(a.candidate.relativePath).localeCompare(normalized(b.candidate.relativePath)));
  const errors: string[] = [];
  if (ranked.filter((item) => item.explicitPrimary).length > 1) errors.push("ambiguous_primary_image");
  if (new Set(ranked.map((item) => item.candidate.sha256)).size !== ranked.length) errors.push("duplicate_image_content");
  if (!ranked.some((item) => item.role === "hero") && ranked[0]) ranked[0].role = "hero";
  let galleryOrder = 1;
  let detailOrder = 0;
  let applicationOrder = 0;
  const matched = ranked.map((item) => ({
    ...item.candidate,
    matchTier: item.tier,
    role: item.role,
    sortOrder: item.role === "hero" ? 0 : item.role === "gallery" ? galleryOrder++ : item.role === "detail" ? detailOrder++ : applicationOrder++,
  }));
  const matchedKeys = new Set(matched.map((item) => item.sourceKey));
  return { matched, unmatched: candidates.filter((item) => !matchedKeys.has(item.sourceKey)), errors };
}
