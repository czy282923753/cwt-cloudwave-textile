import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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
  contentChannelEnum,
  contentTypeEnum,
  editorialRevisionStatusEnum,
  recordStatusEnum,
} from "./enums";
import { users } from "./identity";

export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalKey: text("internal_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  isOrganization: boolean("is_organization").notNull().default(false),
  profileAssetId: uuid("profile_asset_id").references(() => assets.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contents = pgTable(
  "contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: contentChannelEnum("channel").notNull(),
    type: contentTypeEnum("type").notNull().default("article"),
    status: recordStatusEnum("status").notNull().default("draft"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contents_channel_status_idx").on(table.channel, table.status),
    index("contents_author_idx").on(table.authorId),
  ],
);

export const contentLocalizations = pgTable(
  "content_localizations",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull(),
    structuredBlocks: jsonb("structured_blocks")
      .notNull()
      .default({ version: 1, blocks: [] }),
    blocksVersion: integer("blocks_version").notNull().default(1),
    editorDocumentVersion: integer("editor_document_version").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.locale] }),
    check("content_localizations_blocks_version_check", sql`${table.blocksVersion} = 1`),
    check(
      "content_localizations_editor_document_version_check",
      sql`${table.editorDocumentVersion} > 0`,
    ),
  ],
);

export const contentAssets = pgTable(
  "content_assets",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    role: assetRoleEnum("role").notNull().default("inline"),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
    caption: text("caption"),
    isVisible: boolean("is_visible").notNull().default(true),
    blockKey: text("block_key"),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.assetId] }),
    uniqueIndex("content_assets_block_key_unique")
      .on(table.contentId, table.blockKey)
      .where(sql`${table.blockKey} is not null`),
  ],
);

export const editorialRevisions = pgTable(
  "editorial_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    locale: text("locale").notNull().default("en"),
    versionNumber: integer("version_number").notNull(),
    status: editorialRevisionStatusEnum("status").notNull().default("draft"),
    snapshot: jsonb("snapshot").notNull(),
    changeSummary: text("change_summary"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("editorial_revisions_entity_version_unique").on(
      table.entityType,
      table.entityId,
      table.locale,
      table.versionNumber,
    ),
    index("editorial_revisions_status_idx").on(table.status),
  ],
);
