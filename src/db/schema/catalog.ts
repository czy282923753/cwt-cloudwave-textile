import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets";
import {
  assetRoleEnum,
  displayOverrideEnum,
  recordStatusEnum,
  realProductBasisEnum,
  taxonomyDimensionEnum,
  triStateEnum,
  verificationStatusEnum,
} from "./enums";
import { users } from "./identity";

export const taxonomyTerms = pgTable(
  "taxonomy_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    internalKey: text("internal_key").notNull(),
    dimension: taxonomyDimensionEnum("dimension").notNull(),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("taxonomy_terms_internal_key_unique").on(table.internalKey),
    index("taxonomy_terms_dimension_idx").on(table.dimension),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "taxonomy_terms_parent_fk",
    }).onDelete("restrict"),
  ],
);

export const taxonomyTermLocalizations = pgTable(
  "taxonomy_term_localizations",
  {
    taxonomyTermId: uuid("taxonomy_term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (table) => [primaryKey({ columns: [table.taxonomyTermId, table.locale] })],
);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalKey: text("internal_key").notNull().unique(),
  status: recordStatusEnum("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const applicationLocalizations = pgTable(
  "application_localizations",
  {
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    body: text("body"),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.locale] })],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: recordStatusEnum("status").notNull().default("draft"),
    productCode: text("product_code"),
    realProductBasis: realProductBasisEnum("real_product_basis"),
    realProductEvidenceNote: text("real_product_evidence_note"),
    realProductConfirmedByUserId: uuid("real_product_confirmed_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    realProductConfirmedAt: timestamp("real_product_confirmed_at", {
      withTimezone: true,
    }),
    supplierType: text("supplier_type"),
    composition: text("composition"),
    weightGsm: numeric("weight_gsm", { precision: 10, scale: 2 }),
    widthCm: numeric("width_cm", { precision: 10, scale: 2 }),
    fabricStyle: text("fabric_style"),
    colorOptions: text("color_options"),
    moqNote: text("moq_note"),
    customAvailable: triStateEnum("custom_available").notNull().default("unknown"),
    sampleAvailable: triStateEnum("sample_available").notNull().default("unknown"),
    colorOptionsDisplay: displayOverrideEnum("color_options_display")
      .notNull()
      .default("inherit"),
    customAvailableDisplay: displayOverrideEnum("custom_available_display")
      .notNull()
      .default("inherit"),
    sampleAvailableDisplay: displayOverrideEnum("sample_available_display")
      .notNull()
      .default("inherit"),
    moqNoteDisplay: displayOverrideEnum("moq_note_display")
      .notNull()
      .default("hide"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_product_code_unique").on(table.productCode),
    index("products_status_idx").on(table.status),
    check("products_weight_nonnegative", sql`${table.weightGsm} is null or ${table.weightGsm} > 0`),
    check("products_width_nonnegative", sql`${table.widthCm} is null or ${table.widthCm} > 0`),
  ],
);

export const productLocalizations = pgTable(
  "product_localizations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    fullDescription: text("full_description"),
  },
  (table) => [primaryKey({ columns: [table.productId, table.locale] })],
);

export const productTaxonomyTerms = pgTable(
  "product_taxonomy_terms",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    taxonomyTermId: uuid("taxonomy_term_id")
      .notNull()
      .references(() => taxonomyTerms.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.taxonomyTermId] }),
    uniqueIndex("product_taxonomy_one_primary_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
    index("product_taxonomy_term_idx").on(table.taxonomyTermId),
  ],
);

export const productApplications = pgTable(
  "product_applications",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.applicationId] })],
);

export const productFeatures = pgTable("product_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("en"),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productFaqs = pgTable("product_faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("en"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productTags = pgTable(
  "product_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [uniqueIndex("product_tags_slug_unique").on(table.slug)],
);

export const productTagAssignments = pgTable(
  "product_tag_assignments",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => productTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })],
);

export const productAssets = pgTable(
  "product_assets",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    role: assetRoleEnum("role").notNull().default("gallery"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productId, table.assetId] })],
);

export const productFieldReviews = pgTable(
  "product_field_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("provided"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("product_field_reviews_unique").on(table.productId, table.fieldName),
  ],
);

export const fabricLibraryEntries = pgTable("fabric_library_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: recordStatusEnum("status").notNull().default("draft"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  independentValueConfirmedByUserId: uuid(
    "independent_value_confirmed_by_user_id",
  ).references(() => users.id, { onDelete: "set null" }),
  independentValueConfirmedAt: timestamp("independent_value_confirmed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const fabricLibraryEntryLocalizations = pgTable(
  "fabric_library_entry_localizations",
  {
    fabricEntryId: uuid("fabric_entry_id")
      .notNull()
      .references(() => fabricLibraryEntries.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (table) => [primaryKey({ columns: [table.fabricEntryId, table.locale] })],
);

export const fabricLibraryEntryAssets = pgTable(
  "fabric_library_entry_assets",
  {
    fabricEntryId: uuid("fabric_entry_id")
      .notNull()
      .references(() => fabricLibraryEntries.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    role: assetRoleEnum("role").notNull().default("gallery"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.fabricEntryId, table.assetId] })],
);

export const fabricLibraryEntryProducts = pgTable(
  "fabric_library_entry_products",
  {
    fabricEntryId: uuid("fabric_entry_id")
      .notNull()
      .references(() => fabricLibraryEntries.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.fabricEntryId, table.productId] })],
);

export const fabricLibraryEntryApplications = pgTable(
  "fabric_library_entry_applications",
  {
    fabricEntryId: uuid("fabric_entry_id")
      .notNull()
      .references(() => fabricLibraryEntries.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.fabricEntryId, table.applicationId] })],
);
