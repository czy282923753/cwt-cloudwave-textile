import { z } from "zod";

const homePlacementKeys = [
  "hero",
  "products",
  "applications",
  "fabric_library",
  "fabric_sourcing",
  "manufacturing_strength",
  "inquiry_cta",
] as const;

const aboutPlacementKeys = [
  "hero",
  "introduction",
  "owned_manufacturing",
  "service_strength",
  "inquiry_cta",
] as const;

const placementBaseSchema = z.object({
  assetId: z.uuid(),
  placementKey: z.string().min(1).max(80),
  viewport: z.enum(["desktop", "mobile"]),
  role: z.enum(["hero", "gallery", "detail"]),
  sortOrder: z.number().int().min(0).max(1_000),
  altText: z.string().trim().min(1).max(500),
  caption: z.string().trim().min(1).max(1_000).nullable(),
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
  overlayOpacity: z.number().min(0).max(0.9),
  isVisible: z.boolean(),
}).strict();

const homeConfigSchema = z.object({
  version: z.literal(1),
  pageKey: z.literal("home"),
  modules: z.object(Object.fromEntries(
    homePlacementKeys.map((key) => [key, z.boolean()]),
  ) as Record<(typeof homePlacementKeys)[number], z.ZodBoolean>).strict(),
  placements: z.array(placementBaseSchema.extend({
    placementKey: z.enum(homePlacementKeys),
  }).strict()).max(50),
}).strict();

const aboutConfigSchema = z.object({
  version: z.literal(1),
  pageKey: z.literal("about"),
  modules: z.object(Object.fromEntries(
    aboutPlacementKeys.map((key) => [key, z.boolean()]),
  ) as Record<(typeof aboutPlacementKeys)[number], z.ZodBoolean>).strict(),
  placements: z.array(placementBaseSchema.extend({
    placementKey: z.enum(aboutPlacementKeys),
  }).strict()).max(50),
}).strict();

export const staticPageConfigSchema = z.discriminatedUnion("pageKey", [
  homeConfigSchema,
  aboutConfigSchema,
]).superRefine((config, context) => {
  const keys = new Set<string>();
  for (const [index, placement] of config.placements.entries()) {
    const key = `${placement.placementKey}:${placement.viewport}:${placement.assetId}`;
    if (keys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "Static-page Asset placements must be unique.",
        path: ["placements", index],
      });
    }
    keys.add(key);
  }
});

export type StaticPageConfig = z.infer<typeof staticPageConfigSchema>;
export type StaticPageLivePlacement = StaticPageConfig["placements"][number];
type HomeStaticPageConfig = Extract<StaticPageConfig, { pageKey: "home" }>;
type AboutStaticPageConfig = Extract<StaticPageConfig, { pageKey: "about" }>;

export const DEFAULT_STATIC_PAGE_CONFIGS: Readonly<{
  home: HomeStaticPageConfig;
  about: AboutStaticPageConfig;
}> = {
  home: {
    version: 1,
    pageKey: "home",
    modules: {
      hero: true,
      products: true,
      applications: true,
      fabric_library: true,
      fabric_sourcing: true,
      manufacturing_strength: true,
      inquiry_cta: true,
    },
    placements: [],
  },
  about: {
    version: 1,
    pageKey: "about",
    modules: {
      hero: true,
      introduction: true,
      owned_manufacturing: true,
      service_strength: true,
      inquiry_cta: true,
    },
    placements: [],
  },
};

export function deriveStaticPageLivePlacements(
  config: StaticPageConfig,
): StaticPageLivePlacement[] {
  return config.placements.filter((placement) => (
    placement.isVisible &&
    (config.modules as Readonly<Record<string, boolean>>)[placement.placementKey] === true
  ));
}

export interface PersistedStaticPagePlacement {
  systemSettingId: string;
  assetId: string;
  pageKey: string;
  placementKey: string;
  viewport: string;
  role: string;
  sortOrder: number;
  altText: string | null;
  caption: string | null;
  focalX: string | number;
  focalY: string | number;
  isVisible: boolean;
}

export interface ExpectedStaticPagePlacement extends PersistedStaticPagePlacement {
  pageKey: "home" | "about";
  viewport: "desktop" | "mobile";
  role: "hero" | "gallery" | "detail";
}

function projectionKey(value: Omit<PersistedStaticPagePlacement, "systemSettingId">): string {
  return JSON.stringify([
    value.assetId,
    value.pageKey,
    value.placementKey,
    value.viewport,
    value.role,
    value.sortOrder,
    value.altText,
    value.caption,
    Number(value.focalX),
    Number(value.focalY),
    value.isVisible,
  ]);
}

export function expectedStaticPagePlacementRows(
  systemSettingId: string,
  config: StaticPageConfig,
): ExpectedStaticPagePlacement[] {
  return deriveStaticPageLivePlacements(config).map((placement) => ({
    systemSettingId,
    assetId: placement.assetId,
    pageKey: config.pageKey,
    placementKey: placement.placementKey,
    viewport: placement.viewport,
    role: placement.role,
    sortOrder: placement.sortOrder,
    altText: placement.altText,
    caption: placement.caption,
    focalX: placement.focalX,
    focalY: placement.focalY,
    isVisible: true,
  }));
}

export function staticPagePlacementProjectionMatches(
  systemSettingId: string,
  config: StaticPageConfig,
  rows: readonly PersistedStaticPagePlacement[],
): boolean {
  const expected = expectedStaticPagePlacementRows(systemSettingId, config);
  if (expected.length !== rows.length) return false;
  const expectedKeys = expected.map((row) => projectionKey(row)).sort();
  const actualKeys = rows
    .filter((row) => row.systemSettingId === systemSettingId)
    .map((row) => projectionKey(row))
    .sort();
  return expectedKeys.every((key, index) => key === actualKeys[index]);
}

export function isPersistedStaticPagePlacementLive(
  config: StaticPageConfig,
  row: PersistedStaticPagePlacement,
): boolean {
  return expectedStaticPagePlacementRows(row.systemSettingId, config)
    .some((expected) => projectionKey(expected) === projectionKey(row));
}
