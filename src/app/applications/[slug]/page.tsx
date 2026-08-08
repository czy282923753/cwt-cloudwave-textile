import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/config/env";
import { getPublishedApplicationByPath, listProductsForApplication } from "@/public-site/data";
import { ProductCard } from "@/public-site/product-card";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";
import { derivedPageRobots } from "@/seo/page-indexability";

export const revalidate = 3600;
async function resolveApplication(slug: string) {
  return getPublishedApplicationByPath(`/applications/${slug.toLowerCase()}/`);
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const application = await resolveApplication((await params).slug);
  if (!application) return { title: "Application not found", robots: { index: false } };
  return {
    title: { absolute: application.seoTitle ?? `${application.name} | CloudWave Textile` },
    description: application.metaDescription ?? application.shortDescription ?? undefined,
    alternates: { canonical: application.canonicalPath ?? application.path },
    robots: derivedPageRobots(application.indexStatus, application.hasEligibleProducts),
    openGraph: {
      type: "website",
      title: application.seoTitle ?? application.name,
      description: application.metaDescription ?? application.shortDescription ?? undefined,
      url: application.canonicalPath ?? application.path,
    },
  };
}

export default async function ApplicationPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const application = await resolveApplication((await params).slug);
  if (!application) notFound();
  const products = await listProductsForApplication(application.id);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL },
      { "@type": "ListItem", position: 2, name: "Applications", item: new URL("/applications/", env.NEXT_PUBLIC_SITE_URL).toString() },
      { "@type": "ListItem", position: 3, name: application.name, item: new URL(application.path, env.NEXT_PUBLIC_SITE_URL).toString() },
    ],
  };
  return (
    <PublicShell>
      <main>
        <section className="page-hero py-20"><div className="site-container"><p className="eyebrow">Fabric Application</p><h1 className="section-title mt-4">{application.name}</h1>{application.shortDescription ? <p className="mt-6 max-w-3xl text-lg leading-8 text-[#586B73]">{application.shortDescription}</p> : null}<TrackedLink className="button-primary mt-8" eventName="quote_cta_click" href="/get-quote/" placement="application_hero">Find a Fabric for This Use</TrackedLink></div></section>
        {application.body ? <section className="site-container py-16"><div className="prose-cwt max-w-3xl whitespace-pre-line">{application.body}</div></section> : null}
        <section className="site-container pb-20"><h2 className="section-title">Related fabric records</h2>{products.length ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-6 text-[#586B73]">Contact CWT to match a fabric to this application.</p>}</section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
