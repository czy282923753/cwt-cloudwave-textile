import { eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assetVariants,
  authSessions,
  productAssets,
  productLocalizations,
  products,
  productTaxonomyTerms,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { queryPublishedProducts } from "@/public-site/data";
import {
  GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
  serveGovernedPublicAsset,
} from "@/public-site/public-asset-response";
import { ResponsivePublicImage } from "@/public-site/responsive-image";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
} from "./admin-upload-service";
import { DevelopmentFileScanner } from "./scanner";

const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

describe("Admin Finalize responsive public Variant contract", () => {
  it("carries one logical key from real Finalize through srcset and governed delivery", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [admin] = await connection.db.insert(users).values({
        email: "admin-finalize-variant@example.test",
        displayName: "TEST Admin Finalize Variant",
        role: "admin",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      if (!admin) throw new Error("Missing Admin fixture.");
      const [session] = await connection.db.insert(authSessions).values({
        userId: admin.id,
        tokenHash: "admin-finalize-variant-session",
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: authSessions.id });
      const [taxonomy] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "admin-finalize-variant-taxonomy",
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      if (!session || !taxonomy) throw new Error("Missing Variant fixtures.");
      const product = await connection.db.transaction(async (transaction) => {
        const [created] = await transaction.insert(products).values({
          status: "draft",
          createdByUserId: admin.id,
        }).returning({ id: products.id });
        if (!created) throw new Error("Missing Product fixture.");
        await transaction.insert(productTaxonomyTerms).values({
          productId: created.id,
          taxonomyTermId: taxonomy.id,
          isPrimary: true,
        });
        return created;
      });
      await connection.db.insert(productLocalizations).values({
        productId: product.id,
        locale: "en",
        name: "TEST Admin Finalized Responsive Product",
      });
      const [route] = await connection.db.insert(routes).values({
        entityType: "product",
        entityId: product.id,
        locale: "en",
        path: "/products/test-admin-finalized-responsive/",
      }).returning({ id: routes.id });
      if (!route) throw new Error("Missing Product Route fixture.");
      await connection.db.insert(seoMetadata).values({
        routeId: route.id,
        indexStatus: "noindex",
      });

      const sourceBytes = new Uint8Array(await sharp({
        create: {
          width: 1200,
          height: 800,
          channels: 3,
          background: { r: 22, g: 96, b: 82 },
        },
      }).jpeg({ quality: 86 }).toBuffer());
      const actor = {
        userId: admin.id,
        role: admin.role,
        authSessionId: session.id,
      };
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{
          fileName: "TEST-admin-finalized-responsive.jpg",
          declaredMimeType: "image/jpeg",
          declaredByteSize: sourceBytes.byteLength,
        }],
        category: "product",
        role: "hero",
        sortOrder: 0,
        associationType: "product",
        associationEntityId: product.id,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const assetId = await completeAdminUploadIntent(
        connection.db,
        storage,
        new DevelopmentFileScanner(),
        actor,
        { token: batch.intents[0]!.token, bytes: sourceBytes },
      );
      await finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        batch.batchId,
      );
      await connection.db.update(productAssets).set({
        altText: "Synthetic Admin-finalized responsive fabric",
      }).where(eq(productAssets.assetId, assetId));
      await connection.db.update(products).set({
        status: "published",
        realProductBasis: "physical_sample",
        realProductConfirmedByUserId: admin.id,
        realProductConfirmedAt: new Date(),
        publishedAt: new Date(),
      }).where(eq(products.id, product.id));

      const persistedVariants = await connection.db.select().from(assetVariants)
        .where(eq(assetVariants.sourceAssetId, assetId));
      expect(persistedVariants).toHaveLength(6);
      for (const variant of persistedVariants) {
        expect(variant.variantKey).toMatch(/^(480|960|1600)w-(webp|avif)$/);
        expect(variant.variantKey).not.toContain(".");
        expect(variant.objectKey).toMatch(
          new RegExp(`\\.variants/${variant.variantKey}\\.${variant.format}$`),
        );
        await expect(storage.exists("public", variant.objectKey)).resolves.toBe(true);
      }

      const [publicProduct] = await queryPublishedProducts(connection.db, {
        productIds: [product.id],
      });
      expect(publicProduct?.image?.variants).toHaveLength(6);
      const markup = renderToStaticMarkup(
        <ResponsivePublicImage
          asset={publicProduct!.image!}
          height={800}
          sizes="(max-width: 768px) 100vw, 55vw"
          width={1200}
        />,
      );
      expect(markup).toContain('<picture class="relative block h-full w-full">');
      expect(markup).toContain("srcSet=\"/api/public-assets/");
      expect(markup).not.toContain(".webp.webp");
      expect(markup).not.toContain(".avif.avif");

      const projectedVariant = publicProduct!.image!.variants!.find(
        (variant) => variant.format === "webp" && variant.width === 960,
      );
      if (!projectedVariant) throw new Error("Missing projected WebP Variant.");
      const logicalKey = new URL(projectedVariant.url, "http://localhost")
        .searchParams.get("variant");
      expect(logicalKey).toBe("960w-webp");
      const variantResponse = await serveGovernedPublicAsset(
        connection.db,
        storage,
        assetId,
        logicalKey!,
      );
      expect(variantResponse.status).toBe(200);
      expect(variantResponse.headers.get("content-type")).toBe("image/webp");
      expect(variantResponse.headers.get("cache-control")).toBe(
        GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
      );
      const deliveredVariant = new Uint8Array(await variantResponse.arrayBuffer());
      await expect(sharp(deliveredVariant).metadata()).resolves.toMatchObject({
        format: "webp",
        width: 960,
      });

      const originalResponse = await serveGovernedPublicAsset(
        connection.db,
        storage,
        assetId,
      );
      expect(originalResponse.status).toBe(200);
      expect(originalResponse.headers.get("content-type")).toBe("image/jpeg");
      expect(originalResponse.headers.get("cache-control")).toBe(
        GOVERNED_PUBLIC_ASSET_CACHE_CONTROL,
      );
    } finally {
      await connection.close();
    }
  }, 30_000);
});
