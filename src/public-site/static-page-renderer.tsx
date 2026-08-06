import Image from "next/image";
import Link from "next/link";

import type { StaticPageConfig } from "@/content/static-page-projection";

import type {
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
  PublicStaticPagePlacement,
} from "./data";
import { InquiryForm } from "./inquiry-form";
import { ProductCard } from "./product-card";
import { TrackedLink } from "./tracking";

type HomeConfig = Extract<StaticPageConfig, { pageKey: "home" }>;
type AboutConfig = Extract<StaticPageConfig, { pageKey: "about" }>;

function StaticMedia({
  placementKey,
  placements,
  className = "aspect-[4/3]",
}: Readonly<{
  placementKey: string;
  placements: readonly PublicStaticPagePlacement[];
  className?: string;
}>) {
  const desktop = placements.find((item) => item.placementKey === placementKey && item.viewport === "desktop");
  const mobile = placements.find((item) => item.placementKey === placementKey && item.viewport === "mobile");
  const fallback = desktop ?? mobile;
  if (!fallback) return null;
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] bg-stone-200 ${className}`}
      data-static-media={placementKey}
    >
      {desktop ? (
        <Image
          alt={desktop.asset.alt}
          className="hidden object-cover sm:block"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          src={desktop.asset.url}
          style={{ objectPosition: `${desktop.focalX}% ${desktop.focalY}%` }}
          unoptimized
        />
      ) : null}
      {mobile ? (
        <Image
          alt={mobile.asset.alt}
          className={desktop ? "object-cover sm:hidden" : "object-cover"}
          fill
          sizes="100vw"
          src={mobile.asset.url}
          style={{ objectPosition: `${mobile.focalX}% ${mobile.focalY}%` }}
          unoptimized
        />
      ) : null}
      {!mobile && desktop ? (
        <Image
          alt={desktop.asset.alt}
          className="object-cover sm:hidden"
          fill
          sizes="100vw"
          src={desktop.asset.url}
          style={{ objectPosition: `${desktop.focalX}% ${desktop.focalY}%` }}
          unoptimized
        />
      ) : null}
      {desktop?.overlayOpacity ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 hidden bg-black sm:block"
          style={{ opacity: desktop.overlayOpacity }}
        />
      ) : null}
      {mobile?.overlayOpacity ? (
        <span
          aria-hidden="true"
          className={desktop ? "absolute inset-0 bg-black sm:hidden" : "absolute inset-0 bg-black"}
          style={{ opacity: mobile.overlayOpacity }}
        />
      ) : !mobile && desktop?.overlayOpacity ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-black sm:hidden"
          style={{ opacity: desktop.overlayOpacity }}
        />
      ) : null}
      {desktop?.asset.caption ? (
        <p className="absolute inset-x-0 bottom-0 hidden bg-black/65 p-3 text-sm text-white sm:block">
          {desktop.asset.caption}
        </p>
      ) : null}
      {mobile?.asset.caption ? (
        <p className={desktop ? "absolute inset-x-0 bottom-0 bg-black/65 p-3 text-sm text-white sm:hidden" : "absolute inset-x-0 bottom-0 bg-black/65 p-3 text-sm text-white"}>
          {mobile.asset.caption}
        </p>
      ) : !mobile && desktop?.asset.caption ? (
        <p className="absolute inset-x-0 bottom-0 bg-black/65 p-3 text-sm text-white sm:hidden">
          {desktop.asset.caption}
        </p>
      ) : null}
    </div>
  );
}

const strengthTitles = [
  "Own Manufacturing",
  "Fabric Development & Matching",
  "Sampling & Customization",
  "Quality Check",
  "Packing & Delivery Support",
] as const;

export function StaticPageUnavailable({ pageKey }: Readonly<{ pageKey: "home" | "about" }>) {
  return (
    <main className="site-container py-24" data-static-page={pageKey} data-static-page-authority="invalid">
      <h1 className="section-title">{pageKey === "home" ? "CloudWave Textile" : "About CloudWave Textile"}</h1>
      <p className="mt-5 max-w-2xl text-stone-600">
        This page is temporarily unavailable while its live configuration is reviewed.
      </p>
    </main>
  );
}

export function StaticHomeRenderer({
  config,
  placements,
  facts,
  products,
  applications,
  libraryEntries,
  contents,
}: Readonly<{
  config: HomeConfig;
  placements: readonly PublicStaticPagePlacement[];
  facts: readonly string[];
  products: Awaited<ReturnType<typeof listPublishedProducts>>;
  applications: Awaited<ReturnType<typeof listPublishedApplications>>;
  libraryEntries: Awaited<ReturnType<typeof listPublishedFabricEntries>>;
  contents: Awaited<ReturnType<typeof listPublishedContents>>;
  }>) {
  const copy = config.copy;
  if (!copy) {
    return <main data-static-page="home" data-static-page-copy="empty"><h1 className="sr-only">CloudWave Textile</h1></main>;
  }
  return <main data-static-page="home">
    {!config.modules.hero ? <h1 className="sr-only">CloudWave Textile</h1> : null}
    {config.modules.hero ? <section className="relative overflow-hidden border-b border-stone-200 bg-[#f4f0e5]"><div className="site-container grid min-h-[42rem] items-center gap-12 py-20 lg:grid-cols-[1.1fr_.9fr]"><div><p className="eyebrow">{copy.hero.eyebrow}</p><h1 className="display-title mt-6">{copy.hero.title}</h1>{copy.hero.summary ? <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">{copy.hero.summary}</p> : null}<div className="mt-9 flex flex-wrap gap-3"><TrackedLink className="button-primary" eventName="quote_cta_click" href={copy.hero.primaryCta.href} placement="home_hero">{copy.hero.primaryCta.label}</TrackedLink>{copy.hero.secondaryCta ? <TrackedLink className="button-secondary" eventName="quote_cta_click" href={copy.hero.secondaryCta.href} placement="home_hero_secondary">{copy.hero.secondaryCta.label}</TrackedLink> : null}</div></div><StaticMedia className="aspect-[4/5]" placementKey="hero" placements={placements} /></div></section> : null}
    {config.modules.products ? <section className="site-container py-24"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">{copy.products.eyebrow}</p><h2 className="section-title mt-4">{copy.products.title}</h2>{copy.products.summary ? <p className="mt-4 text-stone-600">{copy.products.summary}</p> : null}</div><Link className="button-secondary" href="/products/">All Products</Link></div>{products.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-10 text-stone-600">Product records appear after real-data validation, review, and publication.</p>}</section> : null}
    {config.modules.applications ? <section className="bg-[#143f38] py-24 text-white"><div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow !text-[#93d1bf]">{copy.applications.eyebrow}</p><h2 className="section-title mt-4 !text-white">{copy.applications.title}</h2>{copy.applications.summary ? <p className="mt-6 leading-7 text-white/70">{copy.applications.summary}</p> : null}<Link className="mt-8 inline-flex text-sm font-semibold text-[#a9e2d2]" href="/applications/">Explore Applications →</Link></div><div><StaticMedia className="mb-6 aspect-[16/9]" placementKey="applications" placements={placements} /><div className="grid gap-4 sm:grid-cols-2">{applications.slice(0, 6).map((application) => <Link className="rounded-3xl border border-white/10 bg-white/5 p-6" href={application.path} key={application.id}><h3 className="text-xl font-semibold">{application.name}</h3>{application.shortDescription ? <p className="mt-3 text-sm text-white/70">{application.shortDescription}</p> : null}</Link>)}</div></div></div></section> : null}
    {config.modules.fabric_library ? <section className="site-container py-24"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">{copy.fabricLibrary.eyebrow}</p><h2 className="section-title mt-4">{copy.fabricLibrary.title}</h2></div><Link className="button-secondary" href="/fabric-library/">Browse Library</Link></div><StaticMedia className="mt-8 aspect-[16/7]" placementKey="fabric_library" placements={placements} />{libraryEntries.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{libraryEntries.slice(0, 4).map((entry) => <Link href={entry.path} key={entry.id}><div className="weave-placeholder relative aspect-square overflow-hidden rounded-3xl">{entry.image ? <Image alt={entry.image.alt} className="object-cover" fill sizes="25vw" src={entry.image.url} unoptimized /> : null}</div><h3 className="mt-4 font-semibold text-[#143a34]">{entry.title}</h3></Link>)}</div> : null}</section> : null}
    {config.modules.fabric_sourcing ? <section className="border-y border-stone-200 bg-white py-24"><div className="site-container"><p className="eyebrow">{copy.fabricSourcing.eyebrow}</p><h2 className="section-title mt-4">{copy.fabricSourcing.title}</h2>{copy.fabricSourcing.summary ? <p className="mt-5 max-w-3xl text-stone-600">{copy.fabricSourcing.summary}</p> : null}<StaticMedia className="mt-8 aspect-[16/7]" placementKey="fabric_sourcing" placements={placements} /><div className="mt-10 grid gap-5 md:grid-cols-3">{[["Fabric Knowledge", "/fabric-knowledge/"], ["China Textile Guide", "/china-textile-guide/"], ["China Sourcing Guide", "/china-sourcing-guide/"]] .map(([label, href]) => <Link className="rounded-3xl border border-stone-200 p-7 font-semibold text-[#17695a]" href={href!} key={href}>{label}</Link>)}</div>{contents.length ? <p className="mt-6 text-sm text-stone-500">{contents.length} published resource{contents.length === 1 ? "" : "s"} available.</p> : null}</div></section> : null}
    {config.modules.manufacturing_strength ? <section className="site-container py-24"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">{copy.manufacturingStrength.eyebrow}</p><h2 className="section-title mt-4">{copy.manufacturingStrength.title}</h2>{facts.length ? <ul className="mt-6 grid gap-3 text-stone-600">{facts.map((fact) => <li key={fact}>— {fact}</li>)}</ul> : null}</div><div><StaticMedia className="mb-6 aspect-[16/9]" placementKey="manufacturing_strength" placements={placements} /><div className="grid gap-3 sm:grid-cols-2">{strengthTitles.map((title) => <h3 className="rounded-2xl bg-[#e6eee9] p-5 font-semibold text-[#143a34]" key={title}>{title}</h3>)}</div></div></div></section> : null}
    {config.modules.inquiry_cta ? <section className="bg-[#eadfce] py-24"><div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">{copy.inquiryCta.eyebrow}</p><h2 className="section-title mt-4">{copy.inquiryCta.title}</h2>{copy.inquiryCta.summary ? <p className="mt-6 leading-7 text-stone-600">{copy.inquiryCta.summary}</p> : null}<TrackedLink className="button-secondary mt-6" eventName="quote_cta_click" href={copy.inquiryCta.cta.href} placement="home_inquiry">{copy.inquiryCta.cta.label}</TrackedLink><StaticMedia className="mt-8 aspect-[16/9]" placementKey="inquiry_cta" placements={placements} /></div><div className="rounded-[2rem] bg-[#faf8f2] p-6 shadow-sm sm:p-9"><InquiryForm compact /></div></div></section> : null}
  </main>;
}

export function StaticAboutRenderer({ config, placements, facts }: Readonly<{ config: AboutConfig; placements: readonly PublicStaticPagePlacement[]; facts: readonly string[] }>) {
  const copy = config.copy;
  if (!copy) {
    return <main data-static-page="about" data-static-page-copy="empty"><h1 className="sr-only">About CloudWave Textile</h1></main>;
  }
  return <main data-static-page="about">
    {!config.modules.hero ? <h1 className="sr-only">About CloudWave Textile</h1> : null}
    {config.modules.hero ? <section className="bg-[#143f38] py-24 text-white"><div className="site-container grid gap-10 lg:grid-cols-[1fr_.7fr]"><div><p className="eyebrow !text-[#9bd6c5]">{copy.hero.eyebrow}</p><h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-7xl">{copy.hero.title}</h1>{copy.hero.summary ? <p className="mt-6 text-white/75">{copy.hero.summary}</p> : null}</div><StaticMedia className="aspect-[4/3]" placementKey="hero" placements={placements} /></div></section> : null}
    {config.modules.introduction ? <section className="site-container grid gap-14 py-20 lg:grid-cols-[.75fr_1.25fr]"><div><p className="eyebrow">{copy.introduction.eyebrow}</p><h2 className="section-title mt-4">{copy.introduction.title}</h2></div><div><p className="text-lg leading-8 text-stone-600">{copy.introduction.summary}</p><StaticMedia className="mt-8 aspect-[16/9]" placementKey="introduction" placements={placements} /></div></section> : null}
    {config.modules.owned_manufacturing ? <section className="border-y border-stone-200 bg-white py-20"><div className="site-container grid gap-10 lg:grid-cols-2"><StaticMedia className="aspect-[4/3]" placementKey="owned_manufacturing" placements={placements} /><div><p className="eyebrow">{copy.ownedManufacturing.eyebrow}</p><h2 className="section-title mt-4">{copy.ownedManufacturing.title}</h2>{facts.length ? <ul className="mt-6 grid gap-3">{facts.map((fact) => <li key={fact}>— {fact}</li>)}</ul> : null}</div></div></section> : null}
    {config.modules.service_strength ? <section className="site-container py-20"><p className="eyebrow">{copy.serviceStrength.eyebrow}</p><h2 className="section-title mt-4">{copy.serviceStrength.title}</h2>{copy.serviceStrength.summary ? <p className="mt-5 max-w-3xl leading-7 text-stone-600">{copy.serviceStrength.summary}</p> : null}<StaticMedia className="mt-8 aspect-[16/7]" placementKey="service_strength" placements={placements} /><div className="mt-8 grid gap-4 sm:grid-cols-2">{strengthTitles.slice(1).map((title) => <h3 className="rounded-2xl bg-[#f4f0e5] p-6 text-xl font-semibold text-[#143a34]" key={title}>{title}</h3>)}</div></section> : null}
    {config.modules.inquiry_cta ? <section className="site-container flex flex-wrap items-center justify-between gap-8 py-20"><div><p className="eyebrow">{copy.inquiryCta.eyebrow}</p><h2 className="section-title mt-4">{copy.inquiryCta.title}</h2>{copy.inquiryCta.summary ? <p className="mt-4 text-stone-600">{copy.inquiryCta.summary}</p> : null}</div><TrackedLink className="button-primary" eventName="quote_cta_click" href={copy.inquiryCta.cta.href} placement="about_footer">{copy.inquiryCta.cta.label}</TrackedLink></section> : null}
  </main>;
}
