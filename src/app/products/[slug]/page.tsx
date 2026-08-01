import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { env, publicIndexingAllowed } from "@/config/env";
import { getPublishedProductByPath } from "@/public-site/data";
import { ProductViewTracker } from "@/public-site/product-view-tracker";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const revalidate = 3600;

async function resolveProduct(slug: string) {
  return getPublishedProductByPath(`/products/${slug.toLowerCase()}/`);
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const indexAllowed = publicIndexingAllowed() && product.indexStatus === "index";
  return {
    title: { absolute: product.seoTitle ?? `${product.name} | CloudWave Textile` },
    description: product.metaDescription ?? product.shortDescription ?? undefined,
    alternates: { canonical: product.canonicalPath ?? product.path },
    robots: { index: indexAllowed, follow: indexAllowed },
  };
}

export default async function ProductPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  if (!product) notFound();
  const specifications = [
    product.composition ? ["Composition", product.composition] : null,
    product.weightGsm ? ["Weight", `${product.weightGsm} GSM`] : null,
    product.widthCm ? ["Width", `${product.widthCm} cm`] : null,
    product.colorOptions ? ["Color options", product.colorOptions] : null,
    product.customAvailable && product.customAvailable !== "unknown"
      ? ["Custom available", product.customAvailable === "yes" ? "Yes" : "No"]
      : null,
    product.sampleAvailable && product.sampleAvailable !== "unknown"
      ? ["Sample available", product.sampleAvailable === "yes" ? "Yes" : "No"]
      : null,
    product.moqNote ? ["MOQ", product.moqNote] : null,
  ].filter((item): item is string[] => item !== null);
  const productSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: product.shortDescription ?? product.fullDescription ?? undefined,
        brand: { "@type": "Brand", name: "CloudWave Textile" },
        additionalProperty: specifications.map(([name, value]) => ({
          "@type": "PropertyValue",
          name,
          value,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL },
          { "@type": "ListItem", position: 2, name: "Products", item: new URL("/products/", env.NEXT_PUBLIC_SITE_URL).toString() },
          { "@type": "ListItem", position: 3, name: product.name, item: new URL(product.path, env.NEXT_PUBLIC_SITE_URL).toString() },
        ],
      },
      ...(product.faqs.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: product.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ]
        : []),
    ],
  };
  return (
    <PublicShell>
      <ProductViewTracker path={product.path} productId={product.id} />
      <main>
        <div className="site-container py-6 text-sm text-stone-500"><Link href="/products/">Products</Link><span className="mx-2">/</span><span>{product.name}</span></div>
        <section className="site-container grid gap-10 pb-20 pt-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {product.images.length ? product.images.map((image, index) => <div className={`relative overflow-hidden rounded-[2rem] bg-stone-200 ${index === 0 ? "aspect-[4/3] sm:col-span-2" : "aspect-square"}`} key={image.id}>{image.url ? <Image alt={image.alt} className="object-cover" fill priority={index === 0} sizes={index === 0 ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 1024px) 50vw, 28vw"} src={image.url} unoptimized /> : null}</div>) : <div className="weave-placeholder aspect-[4/3] rounded-[2rem] sm:col-span-2" aria-hidden="true" />}
          </div>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Published Fabric Record</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#143a34] sm:text-5xl">{product.name}</h1>
            {product.shortDescription ? <p className="mt-6 text-lg leading-8 text-stone-600">{product.shortDescription}</p> : null}
            {product.taxonomy.length ? <div className="mt-7 flex flex-wrap gap-2">{product.taxonomy.map((term) => term.path ? <Link className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600" href={term.path} key={term.name}>{term.name}</Link> : <span className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600" key={term.name}>{term.name}</span>)}</div> : null}
            <div className="mt-9 flex flex-wrap gap-3"><TrackedLink className="button-primary" eventName="quote_cta_click" href={`/get-quote/?product=${encodeURIComponent(product.name)}`} placement="product_hero">Find Your Fabric Solution</TrackedLink><TrackedLink className="button-secondary" eventName="quote_cta_click" href="/get-quote/#upload" placement="product_upload">Upload a Reference</TrackedLink></div>
            <p className="mt-5 text-sm leading-6 text-stone-500">No fixed public price. Share the use, quantity context, or reference image for a sourcing response.</p>
          </div>
        </section>

        {specifications.length ? <section className="border-y border-stone-200 bg-white"><div className="site-container py-16"><p className="eyebrow">Confirmed details</p><h2 className="section-title mt-4">Specifications</h2><dl className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">{specifications.map(([label, value]) => <div className="bg-white p-6" key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt><dd className="mt-2 text-lg font-medium text-[#143a34]">{value}</dd></div>)}</dl></div></section> : null}

        {(product.fullDescription || product.features.length || product.applications.length) ? <section className="site-container grid gap-12 py-20 lg:grid-cols-[1.2fr_.8fr]">{product.fullDescription ? <div><p className="eyebrow">Product context</p><h2 className="section-title mt-4">About this fabric</h2><div className="prose-cwt mt-7 whitespace-pre-line">{product.fullDescription}</div></div> : null}<aside className="grid content-start gap-8">{product.features.length ? <div className="rounded-3xl bg-[#e6eee9] p-7"><h2 className="text-xl font-semibold text-[#143a34]">Features</h2><ul className="mt-5 grid gap-3 text-stone-600">{product.features.map((feature) => <li key={feature.label}>— {feature.label}</li>)}</ul></div> : null}{product.applications.length ? <div><h2 className="text-xl font-semibold text-[#143a34]">Applications</h2><div className="mt-4 flex flex-wrap gap-2">{product.applications.map((application) => application.path ? <Link className="rounded-full bg-[#143f38] px-4 py-2 text-sm text-white" href={application.path} key={application.name}>{application.name}</Link> : null)}</div></div> : null}</aside></section> : null}

        {product.faqs.length ? <section className="bg-[#eadfce] py-20"><div className="site-container max-w-4xl"><p className="eyebrow">Questions</p><h2 className="section-title mt-4">Fabric FAQ</h2><div className="mt-8 divide-y divide-stone-300">{product.faqs.map((faq) => <details className="py-5" key={faq.question}><summary className="cursor-pointer font-semibold text-[#143a34]">{faq.question}</summary><p className="mt-3 leading-7 text-stone-600">{faq.answer}</p></details>)}</div></div></section> : null}
        <section className="bg-[#143f38] py-20 text-white"><div className="site-container flex flex-wrap items-center justify-between gap-8"><div><p className="eyebrow !text-[#9bd6c5]">Not sure this is the exact match?</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Send the reference. Start the conversation.</h2></div><TrackedLink className="button-primary" eventName="quote_cta_click" href="/get-quote/" placement="product_footer">Find Your Fabric Solution</TrackedLink></div></section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
