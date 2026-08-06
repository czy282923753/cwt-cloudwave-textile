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

export const HOME_MODULE_ORDER = [...homePlacementKeys] as const;
export const ABOUT_MODULE_ORDER = [...aboutPlacementKeys] as const;

const internalPathSchema = z.string().trim().min(1).max(500).regex(/^\/(?!\/)[^\s]*$/);
const ctaCopySchema = z.object({
  label: z.string().trim().min(1).max(100),
  href: internalPathSchema,
}).strict();
const moduleCopySchema = z.object({
  eyebrow: z.string().trim().max(120),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(2_000),
}).strict();
const factKeyListSchema = z.array(z.string().trim().min(1).max(120)).max(20)
  .refine((keys) => new Set(keys).size === keys.length, {
    message: "Company Fact selections must be unique.",
  });
const homeCopySchema = z.object({
  hero: moduleCopySchema.extend({
    primaryCta: ctaCopySchema,
    secondaryCta: ctaCopySchema.nullable(),
  }).strict(),
  products: moduleCopySchema,
  applications: moduleCopySchema,
  fabricLibrary: moduleCopySchema,
  fabricSourcing: moduleCopySchema,
  manufacturingStrength: moduleCopySchema.extend({
    factKeys: factKeyListSchema,
  }).strict(),
  inquiryCta: moduleCopySchema.extend({ cta: ctaCopySchema }).strict(),
}).strict();
const aboutCopySchema = z.object({
  hero: moduleCopySchema,
  introduction: moduleCopySchema,
  ownedManufacturing: moduleCopySchema.extend({
    factKeys: factKeyListSchema,
  }).strict(),
  serviceStrength: moduleCopySchema,
  inquiryCta: moduleCopySchema.extend({ cta: ctaCopySchema }).strict(),
}).strict();

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
  copy: homeCopySchema.optional(),
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
  copy: aboutCopySchema.optional(),
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
    const key = `${placement.placementKey}:${placement.viewport}`;
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
    copy: {
      hero: {
        eyebrow: "CloudWave Textile · Fabric sourcing from China",
        title: "Professional Fabric Supplier in China",
        summary: "From fabric selection to sourcing solutions, CWT helps global brands and manufacturers narrow suitable textile materials through a requirement-led sourcing process.",
        primaryCta: { label: "Find Your Fabric Solution", href: "/get-quote/" },
        secondaryCta: { label: "Upload Your Fabric Requirement", href: "/get-quote/#upload" },
      },
      products: { eyebrow: "Product matrix", title: "Explore real fabric records", summary: "" },
      applications: { eyebrow: "Applications", title: "Start from what the fabric needs to do.", summary: "Application pages connect end use with relevant Product records." },
      fabricLibrary: { eyebrow: "Fabric Library", title: "A visual path into the range", summary: "" },
      fabricSourcing: { eyebrow: "Fabric & Sourcing", title: "Useful answers before the first sourcing conversation.", summary: "Explore material knowledge, China textile context, and practical sourcing guidance." },
      manufacturingStrength: { eyebrow: "CWT service strength", title: "Manufacturing and sourcing support around the requirement.", summary: "Public facility facts appear only after evidence-backed verification.", factKeys: [] },
      inquiryCta: { eyebrow: "Send less. Start faster.", title: "Find Your Fabric Solution", summary: "Share a short description, an image, or both.", cta: { label: "Start an Inquiry", href: "/get-quote/" } },
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
    copy: {
      hero: { eyebrow: "About CloudWave Textile", title: "A professional fabric supplier and textile sourcing partner in China.", summary: "" },
      introduction: { eyebrow: "Who CWT is", title: "Supplier and sourcing partner—not a single-product factory story.", summary: "CWT helps overseas buyers describe and narrow fabric requirements from specifications, applications, photos, or sample references." },
      ownedManufacturing: { eyebrow: "Own Manufacturing", title: "CWT-owned manufacturing evidence", summary: "Only verified CWT-owned facility facts and governed media can appear here.", factKeys: [] },
      serviceStrength: { eyebrow: "Service capability", title: "Support from matching through delivery coordination.", summary: "Fabric Development & Matching, Sampling & Customization, Quality Check, and Packing & Delivery Support." },
      inquiryCta: { eyebrow: "Start with the requirement", title: "Let CWT help find the next fabric option.", summary: "", cta: { label: "Find Your Fabric Solution", href: "/get-quote/" } },
    },
    placements: [],
  },
};

export type StaticPageLiveAuthorityState = "bootstrap" | "live" | "invalid";

export interface StaticPageLiveAuthority {
  state: StaticPageLiveAuthorityState;
  config: StaticPageConfig | null;
}

export function resolveStaticPageLiveAuthority(
  pageKey: "home" | "about",
  settingValue: unknown | null,
  hasAppliedRevision: boolean,
): StaticPageLiveAuthority {
  if (settingValue === null) {
    return { state: "bootstrap", config: DEFAULT_STATIC_PAGE_CONFIGS[pageKey] };
  }
  const parsed = staticPageConfigSchema.safeParse(settingValue);
  if (!parsed.success || parsed.data.pageKey !== pageKey) {
    return { state: "invalid", config: null };
  }
  if (!hasAppliedRevision) {
    return { state: "bootstrap", config: DEFAULT_STATIC_PAGE_CONFIGS[pageKey] };
  }
  return { state: "live", config: parsed.data };
}

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
