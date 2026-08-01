import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { env, publicIndexingAllowed } from "@/config/env";
import { getPublishedFabricEntryByPath } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const revalidate = 3600;
async function resolveEntry(slug: string) {
  return getPublishedFabricEntryByPath(`/fabric-library/${slug.toLowerCase()}/`);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const entry = await resolveEntry((await params).slug);
  if (!entry) return { title: "Fabric entry not found", robots: { index: false } };
  const index = publicIndexingAllowed() && entry.indexStatus === "index";
  return {
    title: { absolute: entry.seoTitle ?? `${entry.title} | CloudWave Textile` },
    description: entry.metaDescription ?? entry.description ?? undefined,
    alternates: { canonical: entry.canonicalPath ?? entry.path },
    robots: { index, follow: index },
    openGraph: { type: "website", title: entry.seoTitle ?? entry.title, description: entry.metaDescription ?? entry.description ?? undefined, url: entry.canonicalPath ?? entry.path, images: entry.image?.url ? [{ url: entry.image.url }] : undefined },
  };
}

export default async function FabricEntryPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const entry = await resolveEntry((await params).slug);
  if (!entry) notFound();
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL }, { "@type": "ListItem", position: 2, name: "Fabric Library", item: new URL("/fabric-library/", env.NEXT_PUBLIC_SITE_URL).toString() }, { "@type": "ListItem", position: 3, name: entry.title, item: new URL(entry.path, env.NEXT_PUBLIC_SITE_URL).toString() }] };
  return (
    <PublicShell>
      <main>
        <section className="site-container grid gap-10 py-16 lg:grid-cols-[1fr_.85fr]"><div className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-stone-200">{entry.image ? <Image alt={entry.image.alt} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 55vw" src={entry.image.url} unoptimized /> : <div className="weave-placeholder h-full" />}</div><div className="self-center"><p className="eyebrow">Fabric Library Entry</p><h1 className="section-title mt-4">{entry.title}</h1>{entry.description ? <p className="mt-6 text-lg leading-8 text-stone-600">{entry.description}</p> : <p className="mt-6 text-stone-500">Visual reference entry. This page remains Noindex unless standalone value is confirmed.</p>}<TrackedLink className="button-primary mt-8" eventName="quote_cta_click" href="/get-quote/#upload" placement="fabric_entry">Ask About This Fabric</TrackedLink></div></section>
        {entry.relatedProducts.length ? <section className="border-t border-stone-200 bg-white py-16"><div className="site-container"><h2 className="section-title">Related products</h2><div className="mt-8 flex flex-wrap gap-3">{entry.relatedProducts.map((product) => <Link className="button-secondary" href={product.path} key={product.id}>{product.name}</Link>)}</div></div></section> : null}
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
