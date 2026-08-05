import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets";
import { assetRoleEnum } from "./enums";
import { users } from "./identity";

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    configuration: jsonb("configuration"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("feature_flags_key_unique").on(table.key)],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("system_settings_key_unique").on(table.key)],
);

export const sitePageAssets = pgTable(
  "site_page_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    systemSettingId: uuid("system_setting_id")
      .notNull()
      .references(() => systemSettings.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    pageKey: text("page_key").notNull(),
    placementKey: text("placement_key").notNull(),
    viewport: text("viewport").notNull(),
    role: assetRoleEnum("role").notNull().default("hero"),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
    caption: text("caption"),
    focalX: numeric("focal_x", { precision: 5, scale: 2 }).notNull().default("50"),
    focalY: numeric("focal_y", { precision: 5, scale: 2 }).notNull().default("50"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("site_page_assets_placement_asset_unique").on(
      table.systemSettingId,
      table.placementKey,
      table.viewport,
      table.assetId,
    ),
    index("site_page_assets_setting_sort_idx").on(
      table.systemSettingId,
      table.placementKey,
      table.viewport,
      table.sortOrder,
    ),
    index("site_page_assets_asset_idx").on(table.assetId),
    check("site_page_assets_page_key_check", sql`${table.pageKey} in ('home', 'about')`),
    check("site_page_assets_viewport_check", sql`${table.viewport} in ('desktop', 'mobile')`),
    check("site_page_assets_sort_order_check", sql`${table.sortOrder} >= 0`),
    check("site_page_assets_focal_x_check", sql`${table.focalX} between 0 and 100`),
    check("site_page_assets_focal_y_check", sql`${table.focalY} between 0 and 100`),
    check("site_page_assets_placement_key_check", sql`length(${table.placementKey}) between 1 and 80`),
    check("site_page_assets_alt_text_check", sql`${table.altText} is null or length(${table.altText}) <= 500`),
    check("site_page_assets_caption_check", sql`${table.caption} is null or length(${table.caption}) <= 1000`),
  ],
);
