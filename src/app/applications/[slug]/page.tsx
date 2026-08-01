import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { publicIndexingAllowed } from "@/config/env";
import { getPublishedApplicationByPath, listProductsForApplication } from "@/public-site/data";
import { ProductCard } from "@/public-site/product-card";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const revalidate = 3600;

async function resolveApplication(slug: string) {
  return getPublishedApplicationByPath(`/applications/${slug.toLowerCase()}/`);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const application = await resolveApplication((await params).slug);
  if (!application) return { title: "Application not found", robots: { index: false } };
  const index = publicIndexingAllowed() && application.indexStatus === "index";
  return { title: { absolute: application.seoTitle ?? `${application.name} | CloudWave Textile` }, description: application.metaDescription ?? application.shortDescription ?? undefined, alternates: { canonical: application.canonicalPath ?? application.path }, robots: { index, follow: index } };
}

export default async function ApplicationPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const application = await resolveApplication((await params).slug);
  if (!application) notFound();
  const products = await listProductsForApplication(application.id);
  return <PublicShell><main><section className="border-b border-stone-200 bg-[#e6eee9] py-20"><div className="site-container"><p className="eyebrow">Fabric Application</p><h1 className="section-title mt-4">{application.name}</h1>{application.shortDescription ? <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{application.shortDescription}</p> : null}<TrackedLink className="button-primary mt-8" eventName="quote_cta_click" href="/get-quote/" placement="application_hero">Find a Fabric for This Use</TrackedLink></div></section>{application.body ? <section className="site-container py-16"><div className="prose-cwt max-w-3xl whitespace-pre-line">{application.body}</div></section> : null}<section className="site-container pb-20"><h2 className="section-title">Related fabric records</h2>{products.length ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-6 text-stone-600">Contact CWT to match a fabric to this application.</p>}</section></main></PublicShell>;
}
