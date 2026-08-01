import Link from "next/link";
import Image from "next/image";

import { env } from "@/config/env";
import {
  listPublishedApplications,
  listPublishedContents,
  listPublishedFabricEntries,
  listPublishedProducts,
  getVerifiedPublicCompanyFacts,
} from "@/public-site/data";
import { InquiryForm } from "@/public-site/inquiry-form";
import { ProductCard } from "@/public-site/product-card";
import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const revalidate = 3600;

const capabilities = [
  ["China textile supply chain", "Explore multiple fabric categories through a requirement-led sourcing process in China."],
  ["Requirement-led matching", "Share an image, sample reference, application, or performance need; CWT helps narrow suitable material options."],
  ["Sampling and development", "Move from fabric selection toward sample coordination and development discussions as requirements are confirmed."],
] as const;

export default async function Home() {
  const [products, applications, libraryEntries, contents, companyFacts] = await Promise.all([
    listPublishedProducts(6),
    listPublishedApplications(),
    listPublishedFabricEntries(),
    listPublishedContents(),
    getVerifiedPublicCompanyFacts(),
  ]);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CloudWave Textile",
    ...(companyFacts.get("legal_entity_name")
      ? { legalName: companyFacts.get("legal_entity_name") }
      : {}),
    url: env.NEXT_PUBLIC_SITE_URL,
  };
  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-[#f4f0e5]">
          <div className="pointer-events-none absolute -right-24 top-12 size-[34rem] rounded-full border-[5rem] border-[#cde0d8]/70" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-32 w-2/3 rotate-[-4deg] bg-[#eac6af]/30" aria-hidden="true" />
          <div className="site-container relative grid min-h-[45rem] items-center gap-12 py-20 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="eyebrow">CloudWave Textile · Fabric sourcing from China</p>
              <h1 className="display-title mt-6">Professional Fabric Supplier in China</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
                From fabric selection to sourcing solutions, CWT helps global brands and manufacturers find suitable textile materials through China&apos;s multi-category supply chain.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <TrackedLink className="button-primary" eventName="quote_cta_click" href="/get-quote/" placement="home_hero">Find Your Fabric Solution</TrackedLink>
                <TrackedLink className="button-secondary" eventName="quote_cta_click" href="/get-quote/#upload" placement="home_hero_upload">Upload Your Fabric Requirement</TrackedLink>
              </div>
              <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-stone-300 pt-6 text-sm text-stone-600">
                <span>Multi-category sourcing</span><span>Image &amp; sample matching</span><span>Global inquiry support</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
              <div className="weave-placeholder aspect-[4/5] rounded-[3rem] shadow-[0_30px_80px_rgba(31,61,54,.18)]" />
              <div className="absolute -bottom-7 -left-5 max-w-xs rounded-3xl bg-white p-6 shadow-xl">
                <p className="eyebrow">A better starting point</p>
                <p className="mt-3 text-xl font-semibold text-[#143a34]">Show us the fabric you are trying to find.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="site-container py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="eyebrow">Product matrix</p><h2 className="section-title mt-4">Explore real fabric records</h2></div>
            <Link className="button-secondary" href="/products/">All Products</Link>
          </div>
          {products.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-10 rounded-[2rem] border border-dashed border-stone-300 p-10 text-stone-600">Product records will appear after real data, images, review, and publication are complete.</div>}
        </section>

        <section className="bg-[#143f38] py-24 text-white">
          <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="eyebrow !text-[#93d1bf]">Applications</p><h2 className="section-title mt-4 !text-white">Start from what the fabric needs to do.</h2><p className="mt-6 max-w-lg leading-7 text-white/70">Application pages connect end use with relevant product records without confusing use cases with material or construction categories.</p><Link className="mt-8 inline-flex text-sm font-semibold text-[#a9e2d2]" href="/applications/">Explore Applications →</Link></div>
            <div className="grid gap-4 sm:grid-cols-2">{applications.slice(0, 6).map((application, index) => <Link className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10" href={application.path} key={application.id}><span className="text-xs text-white/70">0{index + 1}</span><h3 className="mt-8 text-2xl font-semibold">{application.name}</h3>{application.shortDescription ? <p className="mt-3 text-sm leading-6 text-white/60">{application.shortDescription}</p> : null}</Link>)}{applications.length === 0 ? <p className="rounded-3xl border border-white/10 p-6 text-white/60">Published Applications will appear after review.</p> : null}</div>
          </div>
        </section>

        <section className="site-container py-24">
          <div className="grid gap-12 lg:grid-cols-3">
            {capabilities.map(([title, description], index) => <article className="border-t border-stone-300 pt-6" key={title}><span className="text-sm font-semibold text-[#a94426]">0{index + 1}</span><h2 className="mt-8 text-2xl font-semibold tracking-[-0.03em] text-[#143a34]">{title}</h2><p className="mt-4 leading-7 text-stone-600">{description}</p></article>)}
          </div>
        </section>

        <section className="border-y border-stone-200 bg-white py-24">
          <div className="site-container">
            <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Fabric Library</p><h2 className="section-title mt-4">A visual path into the range</h2></div><Link className="button-secondary" href="/fabric-library/">Browse Library</Link></div>
            {libraryEntries.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{libraryEntries.slice(0, 4).map((entry) => <Link className="group" href={entry.path} key={entry.id}><div className="weave-placeholder relative aspect-square overflow-hidden rounded-3xl">{entry.image ? <Image alt={entry.image.alt} className="object-cover" fill sizes="(max-width: 768px) 50vw, 25vw" src={entry.image.url} unoptimized /> : null}</div><h3 className="mt-4 font-semibold text-[#143a34]">{entry.title}</h3></Link>)}</div> : <p className="mt-10 text-stone-600">Published visual entries will appear here without creating thin indexable pages.</p>}
          </div>
        </section>

        <section className="site-container py-24">
          <p className="eyebrow">Knowledge &amp; sourcing context</p><h2 className="section-title mt-4 max-w-3xl">Useful answers before the first sourcing conversation.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {([['Fabric Knowledge', '/fabric-knowledge/', 'Materials, GSM, width, structures, comparisons, and selection basics.'], ['China Textile Guide', '/china-textile-guide/', 'Textile clusters, markets, and China supply-chain knowledge.'], ['China Sourcing Guide', '/china-sourcing-guide/', 'Supplier evaluation, sampling, MOQ concepts, workflows, and export considerations.']] as const).map(([title, href, description]) => <Link className="rounded-[1.5rem] border border-stone-200 bg-white p-7 hover:-translate-y-1 hover:shadow-lg" href={href} key={href}><h3 className="text-xl font-semibold text-[#143a34]">{title}</h3><p className="mt-4 text-sm leading-6 text-stone-600">{description}</p><span className="mt-8 inline-flex text-sm font-semibold text-[#17695a]">Read the guide →</span></Link>)}
          </div>
          {contents.length ? <p className="mt-8 text-sm text-stone-500">{contents.length} published resource{contents.length === 1 ? "" : "s"} available.</p> : null}
        </section>

        <section className="bg-[#eadfce] py-24">
          <div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="eyebrow">Send less. Start faster.</p><h2 className="section-title mt-4">Find Your Fabric Solution</h2><p className="mt-6 leading-7 text-stone-600">Name and Email are enough to identify you. Add a short description, an image, or both.</p></div>
            <div className="rounded-[2rem] bg-[#faf8f2] p-6 shadow-sm sm:p-9"><InquiryForm compact /></div>
          </div>
        </section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replaceAll("<", "\\u003c") }} type="application/ld+json" />
    </PublicShell>
  );
}
