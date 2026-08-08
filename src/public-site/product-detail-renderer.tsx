import Link from "next/link";

import { BlockRenderer, type BlockMedia, type BlockRelatedLink } from "@/editorial/block-renderer";
import type { BlockDocument } from "@/editorial/blocks";

import { TrackedLink } from "./tracking";
import { ResponsivePublicImage } from "./responsive-image";

export interface ProductDetailViewModel {
  id: string;
  name: string;
  path: string;
  shortDescription: string | null;
  composition?: string | null | undefined;
  weightGsm?: string | null | undefined;
  widthCm?: string | null | undefined;
  colorOptions?: string | null | undefined;
  customAvailable?: "unknown" | "yes" | "no" | null | undefined;
  sampleAvailable?: "unknown" | "yes" | "no" | null | undefined;
  moqValue?: string | null | undefined;
  moqUnit?: string | null | undefined;
  moqNote?: string | null | undefined;
  images: readonly (BlockMedia & { width?: number | null; height?: number | null })[];
  taxonomy: readonly { name: string; path: string | null }[];
  features: readonly { label: string }[];
  applications: readonly { name: string; path: string | null }[];
  faqs: readonly { question: string; answer: string }[];
  narrativeProjection: {
    document: BlockDocument;
    hasRenderableContent: boolean;
    readableText: string;
  };
  relatedProducts: Readonly<Record<string, BlockRelatedLink>>;
  relatedArticles: Readonly<Record<string, BlockRelatedLink>>;
}

export function productSpecifications(product: ProductDetailViewModel): string[][] {
  return [
    product.composition ? ["Composition", product.composition] : null,
    product.weightGsm ? ["Weight", `${product.weightGsm} GSM`] : null,
    product.widthCm ? ["Width", `${product.widthCm} cm`] : null,
    product.colorOptions ? ["Color options", product.colorOptions] : null,
    product.customAvailable && product.customAvailable !== "unknown" ? ["Custom available", product.customAvailable === "yes" ? "Yes" : "No"] : null,
    product.sampleAvailable && product.sampleAvailable !== "unknown" ? ["Sample available", product.sampleAvailable === "yes" ? "Yes" : "No"] : null,
    product.moqValue && product.moqUnit ? ["MOQ", `${product.moqValue} ${product.moqUnit}`] : null,
    product.moqNote ? ["MOQ note", product.moqNote] : null,
  ].filter((item): item is string[] => item !== null);
}

export function ProductDetailRenderer({ product }: Readonly<{ product: ProductDetailViewModel }>) {
  const specifications = productSpecifications(product);
  const blockMedia = Object.fromEntries(product.images.map((image) => [image.id, image]));
  return (
    <main data-product-detail={product.id}>
      <div className="site-container py-6 text-sm text-[#586B73]">
        <Link className="text-[#2F6E97]" href="/products/">Products</Link>
        <span className="mx-2">/</span><span>{product.name}</span>
      </div>
      <section className={`site-container grid gap-10 pb-20 pt-4 ${product.images.length ? "lg:grid-cols-[1.05fr_.95fr]" : "max-w-4xl"}`}>
        {product.images.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {product.images.map((image, index) => (
              <div className={`relative overflow-hidden rounded-lg bg-[#EAF4F5] ${index === 0 ? "aspect-[4/3] sm:col-span-2" : "aspect-square"}`} key={image.id}>
                <ResponsivePublicImage
                  asset={image}
                  className="object-cover"
                  fill
                  priority={index === 0}
                  sizes={index === 0 ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 1024px) 50vw, 28vw"}
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Fabric Record</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#062E39] sm:text-5xl">{product.name}</h1>
          {product.shortDescription ? <p className="mt-6 text-lg leading-8 text-[#586B73]">{product.shortDescription}</p> : null}
          {product.taxonomy.length ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {product.taxonomy.map((term) => term.path ? (
                <Link className="rounded-full border border-[#CCDDE1] px-3 py-1.5 text-xs text-[#586B73]" href={term.path} key={term.name}>{term.name}</Link>
              ) : (
                <span className="rounded-full border border-[#CCDDE1] px-3 py-1.5 text-xs text-[#586B73]" key={term.name}>{term.name}</span>
              ))}
            </div>
          ) : null}
          <div className="mt-9 flex flex-wrap gap-3">
            <TrackedLink className="button-primary" eventName="quote_cta_click" href={`/get-quote/?product=${encodeURIComponent(product.name)}`} placement="product_hero">Find Your Fabric Solution</TrackedLink>
            <TrackedLink className="button-secondary" eventName="quote_cta_click" href="/get-quote/#upload" placement="product_upload">Upload a Reference</TrackedLink>
          </div>
        </div>
      </section>
      {specifications.length ? (
        <section className="border-y border-[#CCDDE1] bg-[#F5F9F9]">
          <div className="site-container py-16">
            <p className="eyebrow">Confirmed details</p><h2 className="section-title mt-4">Specifications</h2>
            <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[#CCDDE1] bg-[#CCDDE1] sm:grid-cols-2 lg:grid-cols-3">
              {specifications.map(([label, value]) => <div className="bg-white p-6" key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-[#586B73]">{label}</dt><dd className="mt-2 text-lg font-medium text-[#062E39]">{value}</dd></div>)}
            </dl>
          </div>
        </section>
      ) : null}
      {product.narrativeProjection.hasRenderableContent || product.features.length || product.applications.length ? (
        <section className="site-container grid gap-12 py-20 lg:grid-cols-[1.2fr_.8fr]">
          {product.narrativeProjection.hasRenderableContent ? (
            <div data-product-narrative="true"><p className="eyebrow">Product context</p><h2 className="section-title mt-4">About this fabric</h2><div className="mt-7"><BlockRenderer document={product.narrativeProjection.document} media={blockMedia} relatedArticles={product.relatedArticles} relatedProducts={product.relatedProducts} /></div></div>
          ) : null}
          <aside className="grid content-start gap-8">
            {product.features.length ? <div className="rounded-lg bg-[#EAF4F5] p-7"><h2 className="text-xl font-semibold text-[#062E39]">Features</h2><ul className="mt-5 grid gap-3 text-[#586B73]">{product.features.map((feature) => <li key={feature.label}>— {feature.label}</li>)}</ul></div> : null}
            {product.applications.length ? <div><h2 className="text-xl font-semibold text-[#062E39]">Applications</h2><div className="mt-4 flex flex-wrap gap-2">{product.applications.map((application) => application.path ? <Link className="rounded-full bg-[#087B76] px-4 py-2 text-sm text-white" href={application.path} key={application.name}>{application.name}</Link> : null)}</div></div> : null}
          </aside>
        </section>
      ) : null}
      {product.faqs.length ? (
        <section className="bg-[#EAF4F5] py-20">
          <div className="site-container max-w-4xl"><p className="eyebrow">Questions</p><h2 className="section-title mt-4">Fabric FAQ</h2><div className="mt-8 divide-y divide-[#B8CDD2]">{product.faqs.map((faq) => <details className="py-5" key={faq.question}><summary className="cursor-pointer font-semibold text-[#062E39]">{faq.question}</summary><p className="mt-3 leading-7 text-[#586B73]">{faq.answer}</p></details>)}</div></div>
        </section>
      ) : null}
      <section className="deep-section py-16">
        <div className="site-container flex flex-wrap items-center justify-between gap-8">
          <h2 className="text-3xl font-semibold text-white">Send the reference. Start the conversation.</h2>
          <TrackedLink className="button-on-deep" eventName="quote_cta_click" href="/get-quote/" placement="product_footer">Find Your Fabric Solution</TrackedLink>
        </div>
      </section>
    </main>
  );
}
