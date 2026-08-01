import { and, count, eq, isNull, ne, or } from "drizzle-orm";

import { databaseConnection } from "../src/db/client";
import {
  assets,
  authors,
  featureFlags,
  inquiryAssets,
  products,
  productTaxonomyTerms,
  users,
} from "../src/db/schema";

async function verifyCurrentDatabase() {
  const db = databaseConnection.db;
  const [userCount, authorCount, flagCount, productCount] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(authors),
    db.select({ value: count() }).from(featureFlags),
    db.select({ value: count() }).from(products),
  ]);

  const invalidPrimaryTaxonomy = await db
    .select({ id: products.id })
    .from(products)
    .leftJoin(
      productTaxonomyTerms,
      and(
        eq(productTaxonomyTerms.productId, products.id),
        eq(productTaxonomyTerms.isPrimary, true),
      ),
    )
    .where(
      or(
        isNull(productTaxonomyTerms.taxonomyTermId),
        ne(productTaxonomyTerms.taxonomyTermId, products.primaryTaxonomyTermId),
      ),
    );

  const invalidInquiryAssets = await db
    .select({ assetId: inquiryAssets.assetId })
    .from(inquiryAssets)
    .innerJoin(assets, eq(assets.id, inquiryAssets.assetId))
    .where(
      or(
        ne(assets.category, "inquiry"),
        ne(assets.access, "private"),
        ne(assets.storagePartition, "private"),
      ),
    );

  const values = {
    users: Number(userCount[0]?.value ?? 0),
    authors: Number(authorCount[0]?.value ?? 0),
    featureFlags: Number(flagCount[0]?.value ?? 0),
    products: Number(productCount[0]?.value ?? 0),
    invalidPrimaryTaxonomy: invalidPrimaryTaxonomy.length,
    invalidInquiryAssets: invalidInquiryAssets.length,
  };

  if (values.users < 1 || values.authors < 1 || values.featureFlags < 4) {
    throw new Error("Core seed verification failed.");
  }
  if (values.invalidPrimaryTaxonomy > 0 || values.invalidInquiryAssets > 0) {
    throw new Error("Database relationship verification failed.");
  }
  return values;
}

async function main(): Promise<void> {
  try {
    const result = await verifyCurrentDatabase();
    process.stdout.write(`Database verification passed: ${JSON.stringify(result)}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main();
