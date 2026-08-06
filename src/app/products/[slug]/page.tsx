import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env, publicIndexingAllowed } from "@/config/env";
import { getPublishedProductByPath } from "@/public-site/data";
import { ProductDetailRenderer, productSpecifications } from "@/public-site/product-detail-renderer";
import { ProductViewTracker } from "@/public-site/product-view-tracker";
import { PublicShell } from "@/public-site/shell";
import { productStructuredData } from "@/seo/structured-data";

export const revalidate = 3600;

async function resolveProduct(slug: string) {
  return getPublishedProductByPath(`/products/${slug.toLowerCase()}/`);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const indexAllowed = publicIndexingAllowed() && product.indexStatus === "index" && product.narrativeProjection.referencesValid;
  return { title: { absolute: product.seoTitle ?? `${product.name} | CloudWave Textile` }, description: product.metaDescription ?? product.shortDescription ?? undefined, alternates: { canonical: product.canonicalPath ?? product.path }, robots: { index: indexAllowed, follow: indexAllowed }, openGraph: { type: "website", title: product.seoTitle ?? product.name, description: product.metaDescription ?? product.shortDescription ?? undefined, url: product.canonicalPath ?? product.path, images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined } };
}

export default async function ProductPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  if (!product) notFound();
  const specifications = productSpecifications(product);
  const productSchema = productStructuredData({
    name: product.name,
    description: product.shortDescription ?? (product.narrativeProjection.readableText || undefined),
    path: product.path,
    specifications,
    faqs: product.faqs,
  }, env.NEXT_PUBLIC_SITE_URL);
  return <PublicShell><ProductViewTracker path={product.path} /><ProductDetailRenderer product={product} /><script dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" /></PublicShell>;
}
