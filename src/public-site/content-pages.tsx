import Link from "next/link";
import { notFound } from "next/navigation";

import { env, publicIndexingAllowed } from "@/config/env";
import { articleAuthorStructuredData } from "@/seo/structured-data";
import { BrandWaveMotif } from "./brand-wave-motif";
import { ContentArticleRenderer } from "./content-article-renderer";
import { getPublishedContentByPath, listPublishedContents } from "./data";
import { PublicShell } from "./shell";
import { TrackedLink } from "./tracking";

type Channel = "fabric_knowledge" | "china_textile_guide" | "china_sourcing_guide";

const channelData: Readonly<Record<Channel, {
  label: string;
  title: string;
  description: string;
  prefix: string;
}>> = {
  fabric_knowledge: {
    label: "Material knowledge",
    title: "Fabric Knowledge",
    description: "Clear explanations of fabric properties, comparisons, measurements, structures, uses, and common sourcing mistakes.",
    prefix: "fabric-knowledge",
  },
  china_textile_guide: {
    label: "Industry context",
    title: "China Textile Guide",
    description: "Explore textile clusters, markets, supply-chain structures, and the context behind sourcing fabric from China.",
    prefix: "china-textile-guide",
  },
  china_sourcing_guide: {
    label: "Commercial guidance",
    title: "China Sourcing Guide",
    description: "Practical guidance for supplier selection, sampling, MOQ conversations, development, and export coordination.",
    prefix: "china-sourcing-guide",
  },
};

const resourceLinks = [
  ["All Resources", "/resources/"],
  ["Fabric Knowledge", "/fabric-knowledge/"],
  ["China Textile Guide", "/china-textile-guide/"],
  ["China Sourcing Guide", "/china-sourcing-guide/"],
] as const;

export async function ContentIndexPage({ channel }: Readonly<{ channel: Channel }>) {
  const information = channelData[channel];
  const contents = await listPublishedContents(channel);
  const channelPath = `/${information.prefix}/`;
  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="page-hero__layout site-container">
            <div>
              <p className="eyebrow">{information.label}</p>
              <h1 className="section-title mt-5 max-w-4xl">{information.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#586B73]">
                {information.description}
              </p>
            </div>
            <BrandWaveMotif compact />
          </div>
        </section>

        <section className="site-container grid gap-10 py-16 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Resource topics">
            <h2 className="text-lg font-semibold text-[#062E39]">Browse Topics</h2>
            <nav className="surface-card mt-4 overflow-hidden">
              {resourceLinks.map(([label, href]) => (
                <Link
                  aria-current={href === channelPath ? "page" : undefined}
                  className={`flex min-h-12 items-center justify-between border-b border-[#DCE7E9] px-4 py-3 text-sm last:border-0 ${href === channelPath ? "border-l-4 border-l-[#04AAA0] font-semibold text-[#087B76]" : "text-[#586B73]"}`}
                  href={href}
                  key={href}
                >
                  {label}<span aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          </aside>

          <div>
            <h2 className="text-2xl font-semibold text-[#062E39]">Published guides</h2>
            {contents.length ? (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {contents.map((content) => (
                  <article className="surface-card surface-card--interactive p-7" key={content.id}>
                    <p className="eyebrow">{content.type.replaceAll("_", " ")}</p>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#062E39]">
                      <Link href={content.path}>{content.title}</Link>
                    </h3>
                    {content.excerpt ? <p className="mt-4 line-clamp-3 leading-7 text-[#586B73]">{content.excerpt}</p> : null}
                    <div className="mt-8 flex items-center justify-between gap-4 text-sm text-[#586B73]">
                      <span>{content.authorName}</span>
                      <Link className="text-link" href={content.path}>Read →</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-[#586B73]">No articles have passed publication review yet.</p>
            )}
          </div>
        </section>

        <section className="deep-section py-10" data-scheme4-zone="content-index-cta">
          <div className="site-container flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-2xl font-semibold text-white">Looking for a specific topic?</p>
              <span aria-hidden="true" className="mt-3 block h-0.5 w-28 bg-[#04AAA0]" />
            </div>
            <TrackedLink
              className="button-on-deep min-w-56"
              eventName="quote_cta_click"
              href="/get-quote/"
              placement="content_index_footer"
            >
              Talk to Our Team
            </TrackedLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

export async function contentMetadata(channel: Channel, slug: string) {
  const information = channelData[channel];
  const path = `/${information.prefix}/${slug.toLowerCase()}/`;
  const content = await getPublishedContentByPath(path);
  if (!content) return { title: "Article not found", robots: { index: false } };
  const index = publicIndexingAllowed() && content.indexStatus === "index";
  return {
    title: { absolute: content.seoTitle ?? `${content.title} | CloudWave Textile` },
    description: content.metaDescription ?? content.excerpt ?? undefined,
    alternates: { canonical: content.canonicalPath ?? content.path },
    robots: { index, follow: index },
    openGraph: {
      type: "article" as const,
      title: content.seoTitle ?? content.title,
      description: content.metaDescription ?? content.excerpt ?? undefined,
      url: content.canonicalPath ?? content.path,
      images: content.images[0]?.url ? [{ url: content.images[0].url }] : undefined,
    },
  };
}

export async function ContentArticlePage({ channel, slug }: Readonly<{ channel: Channel; slug: string }>) {
  const information = channelData[channel];
  const path = `/${information.prefix}/${slug.toLowerCase()}/`;
  const content = await getPublishedContentByPath(path);
  if (!content) notFound();
  const channelPath = `/${information.prefix}/`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: content.title,
        author: articleAuthorStructuredData(content.authorName, content.authorIsOrganization),
        publisher: { "@type": "Organization", name: "CloudWave Textile" },
        datePublished: content.publishedAt?.toISOString(),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: env.NEXT_PUBLIC_SITE_URL },
          { "@type": "ListItem", position: 2, name: information.title, item: new URL(channelPath, env.NEXT_PUBLIC_SITE_URL).toString() },
          { "@type": "ListItem", position: 3, name: content.title, item: new URL(content.path, env.NEXT_PUBLIC_SITE_URL).toString() },
        ],
      },
    ],
  };
  return (
    <PublicShell>
      <ContentArticleRenderer
        channelPath={channelPath}
        channelTitle={information.title}
        content={content}
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
        type="application/ld+json"
      />
    </PublicShell>
  );
}
