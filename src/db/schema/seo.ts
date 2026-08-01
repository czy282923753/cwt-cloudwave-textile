import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  indexStatusEnum,
  linkRelationStatusEnum,
  routeEntityTypeEnum,
  searchIntentEnum,
  topicMemberRoleEnum,
} from "./enums";
import { users } from "./identity";

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locale: text("locale").notNull().default("en"),
    path: text("path").notNull(),
    entityType: routeEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id"),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("routes_path_unique").on(table.path),
    uniqueIndex("routes_current_entity_locale_unique")
      .on(table.entityType, table.entityId, table.locale)
      .where(sql`${table.isCurrent} = true and ${table.entityId} is not null`),
    index("routes_entity_idx").on(table.entityType, table.entityId),
    check("routes_path_absolute", sql`${table.path} like '/%'`),
  ],
);

export const seoMetadata = pgTable(
  "seo_metadata",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    title: text("title"),
    metaDescription: text("meta_description"),
    focusKeyword: text("focus_keyword"),
    indexStatus: indexStatusEnum("index_status").notNull().default("noindex"),
    canonicalPath: text("canonical_path"),
    openGraphTitle: text("open_graph_title"),
    openGraphDescription: text("open_graph_description"),
    openGraphAssetId: uuid("open_graph_asset_id"),
    schemaData: jsonb("schema_data"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("seo_metadata_route_unique").on(table.routeId),
    check(
      "seo_metadata_canonical_absolute",
      sql`${table.canonicalPath} is null or ${table.canonicalPath} like '/%'`,
    ),
  ],
);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    statusCode: text("status_code").notNull().default("301"),
    reason: text("reason").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("redirects_source_path_unique").on(table.sourcePath),
    index("redirects_destination_idx").on(table.destinationPath),
    check(
      "redirects_distinct_paths",
      sql`${table.sourcePath} <> ${table.destinationPath}`,
    ),
    check("redirects_source_absolute", sql`${table.sourcePath} like '/%'`),
    check(
      "redirects_destination_absolute",
      sql`${table.destinationPath} like '/%'`,
    ),
  ],
);

export const seoTopics = pgTable(
  "seo_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    locale: text("locale").notNull().default("en"),
    primaryKeyword: text("primary_keyword").notNull(),
    intent: searchIntentEnum("intent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("seo_topics_keyword_locale_unique").on(table.primaryKeyword, table.locale)],
);

export const keywordPageMappings = pgTable(
  "keyword_page_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locale: text("locale").notNull().default("en"),
    normalizedKeyword: text("normalized_keyword").notNull(),
    intent: searchIntentEnum("intent").notNull(),
    primaryRouteId: uuid("primary_route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "restrict" }),
    notes: text("notes"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("keyword_page_mappings_unique").on(
      table.locale,
      table.normalizedKeyword,
    ),
    index("keyword_page_mappings_route_idx").on(table.primaryRouteId),
  ],
);

export const seoTopicMembers = pgTable(
  "seo_topic_members",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => seoTopics.id, { onDelete: "cascade" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    role: topicMemberRoleEnum("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.routeId] })],
);

export const internalLinkRelations = pgTable(
  "internal_link_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceRouteId: uuid("source_route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    destinationRouteId: uuid("destination_route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    anchorText: text("anchor_text"),
    status: linkRelationStatusEnum("status").notNull().default("suggested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("internal_link_relations_unique").on(
      table.sourceRouteId,
      table.destinationRouteId,
    ),
    check(
      "internal_link_relations_not_self",
      sql`${table.sourceRouteId} <> ${table.destinationRouteId}`,
    ),
  ],
);
