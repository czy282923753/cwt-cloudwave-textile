import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { env } from "@/config/env";

import { findRedirect, getPublishedContentByPath, listPublishedContents } from "./data";
import { PublicShell } from "./shell";
import { TrackedLink } from "./tracking";

type Channel = "fabric_knowledge" | "china_textile_guide" | "china_sourcing_guide";

const channelData: Readonly<Record<Channel, { label: string; title: string; description: string; prefix: string }>> = {
  fabric_knowledge: { label: "Material knowledge", title: "Fabric Knowledge", description: "Clear explanations of fabric properties, comparisons, measurements, structures, uses, and common sourcing mistakes.", prefix: "fabric-knowledge" },
  china_textile_guide: { label: "Industry context", title: "China Textile Guide", description: "Explore textile clusters, markets, supply-chain structures, and the context behind sourcing fabric from China.", prefix: "china-textile-guide" },
  china_sourcing_guide: { label: "Commercial guidance", title: "China Sourcing Guide", description: "Practical guidance for supplier selection, sampling, MOQ conversations, development, and export coordination.", prefix: "china-sourcing-guide" },
};

export async function ContentIndexPage({ channel }: Readonly<{ channel: Channel }>) {
  const information = channelData[channel];
  const contents = await listPublishedContents(channel);
  return <PublicShell><main><section className="bg-[#e6eee9] py-20"><div className="site-container"><p className="eyebrow">{information.label}</p><h1 className="section-title mt-4">{information.title}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{information.description}</p></div></section><section className="site-container py-16">{contents.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{contents.map((content) => <article className="rounded-[1.5rem] border border-stone-200 bg-white p-7" key={content.id}><p className="eyebrow">{content.type.replaceAll("_", " ")}</p><h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#143a34]"><Link href={content.path}>{content.title}</Link></h2>{content.excerpt ? <p className="mt-4 line-clamp-3 leading-7 text-stone-600">{content.excerpt}</p> : null}<div className="mt-8 flex items-center justify-between text-sm text-stone-500"><span>{content.authorName}</span><Link className="font-semibold text-[#17695a]" href={content.path}>Read →</Link></div></article>)}</div> : <p className="text-stone-600">No articles have passed publication review yet.</p>}</section></main></PublicShell>;
}

export async function contentMetadata(channel: Channel, slug: string) {
  const information = channelData[channel];
  const path = `/${information.prefix}/${slug.toLowerCase()}`;
  const content = await getPublishedContentByPath(path);
  if (!content) return { title: "Article not found", robots: { index: false } };
  const index = env.APP_ENV === "production" && content.indexStatus === "index";
  return { title: { absolute: content.seoTitle ?? `${content.title} | CloudWave Textile` }, description: content.metaDescription ?? content.excerpt ?? undefined, alternates: { canonical: content.canonicalPath ?? content.path }, robots: { index, follow: index } };
}

export async function ContentArticlePage({ channel, slug }: Readonly<{ channel: Channel; slug: string }>) {
  const information = channelData[channel];
  const path = `/${information.prefix}/${slug.toLowerCase()}`;
  const content = await getPublishedContentByPath(path);
  if (!content) { const destination = await findRedirect(path); if (destination) permanentRedirect(destination); notFound(); }
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: content.title, author: { "@type": "Organization", name: content.authorName }, publisher: { "@type": "Organization", name: "CloudWave Textile" }, datePublished: content.publishedAt?.toISOString() }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL }, { "@type": "ListItem", position: 2, name: information.title, item: new URL(`/${information.prefix}`, env.NEXT_PUBLIC_SITE_URL).toString() }, { "@type": "ListItem", position: 3, name: content.title, item: new URL(content.path, env.NEXT_PUBLIC_SITE_URL).toString() }] }] };
  return <PublicShell><main><article><header className="bg-[#eadfce] py-20"><div className="site-container max-w-4xl"><p className="eyebrow">{information.title}</p><h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#143a34] sm:text-6xl">{content.title}</h1>{content.excerpt ? <p className="mt-6 text-xl leading-8 text-stone-600">{content.excerpt}</p> : null}<p className="mt-8 text-sm text-stone-500">By {content.authorName}</p></div></header><div className="site-container max-w-4xl py-16"><div className="prose-cwt whitespace-pre-line text-lg">{content.body}</div><div className="mt-16 rounded-[2rem] bg-[#e6eee9] p-8"><h2 className="text-2xl font-semibold text-[#143a34]">Need help applying this to a real sourcing request?</h2><p className="mt-3 leading-7 text-stone-600">Share an application, description, or fabric image with CWT.</p><TrackedLink className="button-primary mt-6" eventName="quote_cta_click" href="/get-quote" placement="article_footer">Find Your Fabric Solution</TrackedLink></div></div></article></main><script dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }} type="application/ld+json" /></PublicShell>;
}
