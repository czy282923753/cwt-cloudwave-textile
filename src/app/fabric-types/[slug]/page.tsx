import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env, publicIndexingAllowed } from "@/config/env";
import { getPublishedTaxonomyByPath, listProductsForTaxonomy } from "@/public-site/data";
import { ProductCard } from "@/public-site/product-card";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const revalidate = 3600;
async function resolveTerm(slug: string) {
  return getPublishedTaxonomyByPath(`/fabric-types/${slug.toLowerCase()}/`);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const term = await resolveTerm((await params).slug);
  if (!term) return { title: "Fabric type not found", robots: { index: false } };
  const index = publicIndexingAllowed() && term.indexStatus === "index";
  return { title: term.name, description: term.description ?? undefined, alternates: { canonical: term.path }, robots: { index, follow: index }, openGraph: { type: "website", title: term.name, description: term.description ?? undefined, url: term.path } };
}

export default async function FabricTypePage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const term = await resolveTerm((await params).slug);
  if (!term) notFound();
  const products = await listProductsForTaxonomy(term.id);
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL }, { "@type": "ListItem", position: 2, name: "Fabric Types", item: new URL("/fabric-types/", env.NEXT_PUBLIC_SITE_URL).toString() }, { "@type": "ListItem", position: 3, name: term.name, item: new URL(term.path, env.NEXT_PUBLIC_SITE_URL).toString() }] };
  return (
    <PublicShell>
      <main><section className="bg-[#eadfce] py-20"><div className="site-container"><p className="eyebrow">{term.dimension.replaceAll("_", " ")}</p><h1 className="section-title mt-4">{term.name}</h1>{term.description ? <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{term.description}</p> : null}<TrackedLink className="button-primary mt-8" eventName="quote_cta_click" href="/get-quote/" placement="taxonomy_hero">Ask About This Fabric Type</TrackedLink></div></section><section className="site-container py-16"><h2 className="section-title">Related products</h2>{products.length ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-6 text-stone-600">No published product records are linked yet.</p>}</section></main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
