import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import {
  projectStaticPageEvidenceGates,
  STATIC_PAGE_FACT_SENSITIVE_LABELS,
  type StaticPageConfig,
} from "@/content/static-page-projection";

import type {
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
  PublicStaticPagePlacement,
} from "./data";
import { BrandWaveMotif } from "./brand-wave-motif";
import { InquiryForm } from "./inquiry-form";
import { ProductCard } from "./product-card";
import { TrackedLink } from "./tracking";
import { publicAssetSrcSet, ResponsivePublicImage } from "./responsive-image";

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
  const desktopAsset = desktop?.asset ?? fallback.asset;
  const mobileAsset = mobile?.asset ?? fallback.asset;
  const desktopAvif = publicAssetSrcSet(desktopAsset, "avif");
  const desktopWebp = publicAssetSrcSet(desktopAsset, "webp");
  const mobileAvif = publicAssetSrcSet(mobileAsset, "avif");
  const mobileWebp = publicAssetSrcSet(mobileAsset, "webp");
  const sizes = "(max-width: 1024px) 100vw, 50vw";
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#EAF4F5] ${className}`}
      data-static-media={placementKey}
    >
      <picture className="relative block h-full w-full">
        {desktopAvif ? <source media="(min-width: 640px)" sizes={sizes} srcSet={desktopAvif} type="image/avif" /> : null}
        {desktopWebp ? <source media="(min-width: 640px)" sizes={sizes} srcSet={desktopWebp} type="image/webp" /> : null}
        {mobileAvif ? <source media="(max-width: 639px)" sizes="100vw" srcSet={mobileAvif} type="image/avif" /> : null}
        {mobileWebp ? <source media="(max-width: 639px)" sizes="100vw" srcSet={mobileWebp} type="image/webp" /> : null}
        <Image
          alt={fallback.asset.alt}
          className="object-cover [object-position:var(--mobile-object-position)] sm:[object-position:var(--desktop-object-position)]"
          fetchPriority={placementKey === "hero" ? "high" : undefined}
          fill
          loading={placementKey === "hero" ? "eager" : "lazy"}
          sizes={sizes}
          src={fallback.asset.url}
          style={{
            "--desktop-object-position": `${(desktop ?? fallback).focalX}% ${(desktop ?? fallback).focalY}%`,
            "--mobile-object-position": `${(mobile ?? fallback).focalX}% ${(mobile ?? fallback).focalY}%`,
          } as CSSProperties}
          unoptimized
        />
      </picture>
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

function hasPlacement(
  placements: readonly PublicStaticPagePlacement[],
  placementKey: string,
): boolean {
  return placements.some((placement) => placement.placementKey === placementKey);
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
      <p className="mt-5 max-w-2xl text-[#586B73]">
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
  facts: readonly { key: string; statement: string }[];
  products: Awaited<ReturnType<typeof listPublishedProducts>>;
  applications: Awaited<ReturnType<typeof listPublishedApplications>>;
  libraryEntries: Awaited<ReturnType<typeof listPublishedFabricEntries>>;
  contents: Awaited<ReturnType<typeof listPublishedContents>>;
}>) {
  const copy = config.copy;
  if (!copy) {
    return <main data-static-page="home" data-static-page-copy="empty"><h1 className="sr-only">CloudWave Textile</h1></main>;
  }
  const evidenceGates = projectStaticPageEvidenceGates(
    config,
    new Set(facts.map((fact) => fact.key)),
    new Set(placements.map((placement) => placement.placementKey)),
  );

  return (
    <main data-static-page="home">
      {!config.modules.hero ? <h1 className="sr-only">CloudWave Textile</h1> : null}

      {config.modules.hero ? (
        <section className="page-hero">
          <div className="page-hero__layout site-container">
            <div className="relative z-10">
              <p className="eyebrow">{copy.hero.eyebrow}</p>
              <h1 className="display-title mt-6">{copy.hero.title}</h1>
              {copy.hero.summary ? (
                <p className="mt-7 max-w-2xl text-lg leading-8 text-[#586B73] sm:text-xl">
                  {copy.hero.summary}
                </p>
              ) : null}
              <div className="mt-9 flex flex-wrap gap-3">
                <TrackedLink
                  className="button-primary"
                  eventName="quote_cta_click"
                  href={copy.hero.primaryCta.href}
                  placement="home_hero"
                >
                  {copy.hero.primaryCta.label}
                </TrackedLink>
                {copy.hero.secondaryCta ? (
                  <TrackedLink
                    className="button-secondary"
                    eventName="quote_cta_click"
                    href={copy.hero.secondaryCta.href}
                    placement="home_hero_secondary"
                  >
                    {copy.hero.secondaryCta.label}
                  </TrackedLink>
                ) : null}
              </div>
            </div>
            {hasPlacement(placements, "hero") ? (
              <StaticMedia className="aspect-[4/5]" placementKey="hero" placements={placements} />
            ) : (
              <BrandWaveMotif />
            )}
          </div>
        </section>
      ) : null}

      {config.modules.products ? (
        <section className="site-container py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{copy.products.eyebrow}</p>
              <h2 className="section-title mt-4">{copy.products.title}</h2>
              {copy.products.summary ? <p className="mt-4 text-[#586B73]">{copy.products.summary}</p> : null}
            </div>
            <Link className="button-secondary" href="/products/">All Products</Link>
          </div>
          {products.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <p className="mt-10 text-[#586B73]">
              Product records appear after real-data validation, review, and publication.
            </p>
          )}
        </section>
      ) : null}

      {config.modules.applications ? (
        <section className="deep-section py-20 sm:py-24" data-scheme4-zone="home-applications">
          <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">{copy.applications.eyebrow}</p>
              <h2 className="section-title mt-4">{copy.applications.title}</h2>
              {copy.applications.summary ? <p className="mt-6 leading-7 text-white/75">{copy.applications.summary}</p> : null}
              <Link className="mt-8 inline-flex font-semibold text-[#8EE2DC]" href="/applications/">
                Explore Applications →
              </Link>
            </div>
            <div>
              {hasPlacement(placements, "applications") ? (
                <StaticMedia className="mb-6 aspect-[16/9]" placementKey="applications" placements={placements} />
              ) : null}
              {applications.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {applications.slice(0, 6).map((application) => (
                    <Link className="rounded border border-white/20 bg-white/5 p-6" href={application.path} key={application.id}>
                      <h3 className="text-xl font-semibold text-white">{application.name}</h3>
                      {application.shortDescription ? <p className="mt-3 text-sm text-white/75">{application.shortDescription}</p> : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <BrandWaveMotif compact dark />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {config.modules.fabric_library ? (
        <section className="site-container py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{copy.fabricLibrary.eyebrow}</p>
              <h2 className="section-title mt-4">{copy.fabricLibrary.title}</h2>
            </div>
            <Link className="button-secondary" href="/fabric-library/">Browse Library</Link>
          </div>
          <StaticMedia className="mt-8 aspect-[16/7]" placementKey="fabric_library" placements={placements} />
          {libraryEntries.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {libraryEntries.slice(0, 4).map((entry) => (
                <Link className="surface-card surface-card--interactive overflow-hidden p-4" href={entry.path} key={entry.id}>
                  {entry.image ? (
                    <div className="relative aspect-square overflow-hidden rounded bg-[#EAF4F5]">
                      <ResponsivePublicImage asset={entry.image} className="object-cover" fill sizes="25vw" />
                    </div>
                  ) : null}
                  <h3 className={`${entry.image ? "mt-4 " : ""}font-semibold text-[#062E39]`}>{entry.title}</h3>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {config.modules.fabric_sourcing ? (
        <section className="border-y border-[#CCDDE1] bg-[#F5F9F9] py-20 sm:py-24">
          <div className="site-container">
            <p className="eyebrow">{copy.fabricSourcing.eyebrow}</p>
            <h2 className="section-title mt-4">{copy.fabricSourcing.title}</h2>
            {copy.fabricSourcing.summary ? <p className="mt-5 max-w-3xl text-[#586B73]">{copy.fabricSourcing.summary}</p> : null}
            <StaticMedia className="mt-8 aspect-[16/7]" placementKey="fabric_sourcing" placements={placements} />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                ["Fabric Knowledge", "/fabric-knowledge/"],
                ["China Textile Guide", "/china-textile-guide/"],
                ["China Sourcing Guide", "/china-sourcing-guide/"],
              ].map(([label, href]) => (
                <Link className="surface-card surface-card--interactive p-7 font-semibold text-[#087B76]" href={href!} key={href}>
                  {label} →
                </Link>
              ))}
            </div>
            {contents.length ? <p className="mt-6 text-sm text-[#586B73]">{contents.length} published resource{contents.length === 1 ? "" : "s"} available.</p> : null}
          </div>
        </section>
      ) : null}

      {evidenceGates.manufacturing_strength ? (
        <section className="site-container py-20 sm:py-24" data-fact-sensitive-module="manufacturing_strength">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <h2 className="section-title">{STATIC_PAGE_FACT_SENSITIVE_LABELS.manufacturing_strength}</h2>
              <ul className="mt-6 grid gap-3 text-[#586B73]">
                {facts.map((fact) => <li key={fact.key}>— {fact.statement}</li>)}
              </ul>
            </div>
            <div>
              <StaticMedia className="mb-6 aspect-[16/9]" placementKey="manufacturing_strength" placements={placements} />
              <div className="grid gap-3 sm:grid-cols-2">
                {strengthTitles.map((title) => <h3 className="rounded bg-[#EAF4F5] p-5 font-semibold text-[#062E39]" key={title}>{title}</h3>)}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {config.modules.inquiry_cta ? (
        <section className="border-t border-[#CCDDE1] bg-[#EAF4F5] py-20 sm:py-24">
          <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">{copy.inquiryCta.eyebrow}</p>
              <h2 className="section-title mt-4">{copy.inquiryCta.title}</h2>
              {copy.inquiryCta.summary ? <p className="mt-6 leading-7 text-[#586B73]">{copy.inquiryCta.summary}</p> : null}
              <TrackedLink className="button-secondary mt-6" eventName="quote_cta_click" href={copy.inquiryCta.cta.href} placement="home_inquiry">
                {copy.inquiryCta.cta.label}
              </TrackedLink>
              <StaticMedia className="mt-8 aspect-[16/9]" placementKey="inquiry_cta" placements={placements} />
            </div>
            <div className="surface-card p-6 shadow-sm sm:p-9">
              <InquiryForm compact />
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function StaticAboutRenderer({
  config,
  placements,
  facts,
}: Readonly<{
  config: AboutConfig;
  placements: readonly PublicStaticPagePlacement[];
  facts: readonly { key: string; statement: string }[];
}>) {
  const copy = config.copy;
  if (!copy) {
    return <main data-static-page="about" data-static-page-copy="empty"><h1 className="sr-only">About CloudWave Textile</h1></main>;
  }
  const evidenceGates = projectStaticPageEvidenceGates(
    config,
    new Set(facts.map((fact) => fact.key)),
    new Set(placements.map((placement) => placement.placementKey)),
  );
  return (
    <main data-static-page="about">
      {!config.modules.hero ? <h1 className="sr-only">About CloudWave Textile</h1> : null}
      {config.modules.hero ? (
        <section className="page-hero">
          <div className="page-hero__layout site-container">
            <div>
              <p className="eyebrow">{copy.hero.eyebrow}</p>
              <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#062E39] sm:text-7xl">{copy.hero.title}</h1>
              {copy.hero.summary ? <p className="mt-6 text-[#586B73]">{copy.hero.summary}</p> : null}
            </div>
            {hasPlacement(placements, "hero") ? <StaticMedia className="aspect-[4/3]" placementKey="hero" placements={placements} /> : <BrandWaveMotif compact />}
          </div>
        </section>
      ) : null}
      {config.modules.introduction ? (
        <section className="site-container grid gap-14 py-20 lg:grid-cols-[.75fr_1.25fr]">
          <div><p className="eyebrow">{copy.introduction.eyebrow}</p><h2 className="section-title mt-4">{copy.introduction.title}</h2></div>
          <div><p className="text-lg leading-8 text-[#586B73]">{copy.introduction.summary}</p><StaticMedia className="mt-8 aspect-[16/9]" placementKey="introduction" placements={placements} /></div>
        </section>
      ) : null}
      {evidenceGates.owned_manufacturing ? (
        <section className="border-y border-[#CCDDE1] bg-[#F5F9F9] py-20" data-fact-sensitive-module="owned_manufacturing">
          <div className="site-container grid gap-10 lg:grid-cols-2">
            <StaticMedia className="aspect-[4/3]" placementKey="owned_manufacturing" placements={placements} />
            <div><h2 className="section-title">{STATIC_PAGE_FACT_SENSITIVE_LABELS.owned_manufacturing}</h2><ul className="mt-6 grid gap-3 text-[#586B73]">{facts.map((fact) => <li key={fact.key}>— {fact.statement}</li>)}</ul></div>
          </div>
        </section>
      ) : null}
      {evidenceGates.service_strength ? (
        <section className="site-container py-20" data-fact-sensitive-module="service_strength">
          <h2 className="section-title">{STATIC_PAGE_FACT_SENSITIVE_LABELS.service_strength}</h2>
          <StaticMedia className="mt-8 aspect-[16/7]" placementKey="service_strength" placements={placements} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {strengthTitles.slice(1).map((title) => <h3 className="rounded bg-[#EAF4F5] p-6 text-xl font-semibold text-[#062E39]" key={title}>{title}</h3>)}
          </div>
        </section>
      ) : null}
      {config.modules.inquiry_cta ? (
        <section className="border-t border-[#CCDDE1] bg-[#EAF4F5] py-20">
          <div className="site-container flex flex-wrap items-center justify-between gap-8">
            <div><p className="eyebrow">{copy.inquiryCta.eyebrow}</p><h2 className="section-title mt-4">{copy.inquiryCta.title}</h2>{copy.inquiryCta.summary ? <p className="mt-4 text-[#586B73]">{copy.inquiryCta.summary}</p> : null}</div>
            <TrackedLink className="button-primary" eventName="quote_cta_click" href={copy.inquiryCta.cta.href} placement="about_footer">{copy.inquiryCta.cta.label}</TrackedLink>
          </div>
        </section>
      ) : null}
    </main>
  );
}
