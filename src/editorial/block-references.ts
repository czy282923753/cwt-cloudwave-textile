import { inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { contents, products } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import type { BlockDocument } from "./blocks";

export function referencedEditorialEntities(document: BlockDocument): {
  productIds: string[];
  contentIds: string[];
} {
  return {
    productIds: [...new Set(document.blocks.flatMap((block) =>
      block.type === "related_products" ? block.productIds : [],
    ))],
    contentIds: [...new Set(document.blocks.flatMap((block) =>
      block.type === "related_articles" ? block.contentIds : [],
    ))],
  };
}

export async function assertEditorialBlockReferencesExist<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, document: BlockDocument): Promise<void> {
  const { productIds, contentIds } = referencedEditorialEntities(document);
  const [productRows, contentRows] = await Promise.all([
    productIds.length
      ? db.select({ id: products.id }).from(products).where(inArray(products.id, productIds))
      : Promise.resolve([]),
    contentIds.length
      ? db.select({ id: contents.id }).from(contents).where(inArray(contents.id, contentIds))
      : Promise.resolve([]),
  ]);
  if (productRows.length !== productIds.length || contentRows.length !== contentIds.length) {
    throw new Error("Related Product and Article Blocks must reference existing records.");
  }
}
