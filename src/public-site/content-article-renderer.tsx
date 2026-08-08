import Link from "next/link";

import { BlockRenderer, type BlockMedia, type BlockRelatedLink } from "@/editorial/block-renderer";
import type { BlockDocument } from "@/editorial/blocks";

import { BrandWaveMotif } from "./brand-wave-motif";
import { TrackedLink } from "./tracking";
import { ResponsivePublicImage } from "./responsive-image";

export interface ContentArticleViewModel {
  id: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  document: BlockDocument;
  images: readonly (BlockMedia & { width?: number | null; height?: number | null })[];
  blockMedia: Readonly<Record<string, BlockMedia>>;
  relatedProducts: Readonly<Record<string, BlockRelatedLink>>;
  relatedArticles: Readonly<Record<string, BlockRelatedLink>>;
}

const resourceLinks = [
  ["Fabric Knowledge", "/fabric-knowledge/"],
  ["China Textile Guide", "/china-textile-guide/"],
  ["China Sourcing Guide", "/china-sourcing-guide/"],
] as const;

export function ContentArticleRenderer({
  content,
  channelTitle,
  channelPath = "/resources/",
}: Readonly<{
  content: ContentArticleViewModel;
  channelTitle: string;
  channelPath?: string;
}>) {
  const headings = content.document.blocks.flatMap((block) => (
    block.type === "heading"
      ? [{ id: block.id, label: block.text, level: block.level }]
      : []
  ));

  return (
    <main data-content-article={content.id}>
      <article>
        <header className="page-hero">
          <div className="page-hero__layout site-container">
            <div>
              <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[#2F6E97]">
                <Link href="/">Home</Link><span aria-hidden="true">/</span>
                <Link href={channelPath}>{channelTitle}</Link><span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#586B73]">Article</span>
              </nav>
              <p className="eyebrow">{channelTitle}</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#062E39] sm:text-6xl">
                {content.title}
              </h1>
              {content.excerpt ? <p className="mt-6 text-xl leading-8 text-[#586B73]">{content.excerpt}</p> : null}
              <p className="mt-8 text-sm text-[#586B73]">By {content.authorName}</p>
            </div>
            <BrandWaveMotif compact />
          </div>
        </header>

        {content.images[0] ? (
          <div className="site-container max-w-5xl pt-12">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#EAF4F5]">
              <ResponsivePublicImage
                asset={content.images[0]}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 960px"
              />
            </div>
          </div>
        ) : null}

        <div className="site-container grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <BlockRenderer
              document={content.document}
              media={content.blockMedia}
              relatedArticles={content.relatedArticles}
              relatedProducts={content.relatedProducts}
            />
          </div>

          <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
            {headings.length ? (
              <nav aria-label="On this page" className="surface-card p-6">
                <h2 className="text-lg font-semibold text-[#062E39]">On this page</h2>
                <div className="mt-3 grid">
                  {headings.map((heading) => (
                    <Link
                      className={`border-b border-[#DCE7E9] py-2.5 text-sm text-[#2F6E97] last:border-0 ${heading.level > 2 ? "pl-3" : ""}`}
                      href={`#block-${heading.id}`}
                      key={heading.id}
                    >
                      {heading.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : null}
            <div className="deep-section rounded-lg p-6" data-scheme4-zone="article-consultation">
              <h2 className="text-xl font-semibold text-white">Need sourcing help?</h2>
              <span aria-hidden="true" className="mt-3 block h-0.5 w-10 bg-[#04AAA0]" />
              <p className="mt-4 leading-7 text-white/75">
                Share an application, description, or fabric image with CWT.
              </p>
              <TrackedLink
                className="button-on-deep mt-6 w-full"
                eventName="quote_cta_click"
                href="/get-quote/"
                placement="article_sidebar"
              >
                Talk to Our Team
              </TrackedLink>
            </div>
          </aside>
        </div>

        <section className="deep-section py-10" data-scheme4-zone="article-related-resources">
          <div className="site-container">
            <h2 className="text-2xl font-semibold text-white">Explore more resources</h2>
            <nav aria-label="Explore more resources" className="mt-6 grid gap-5 sm:grid-cols-3">
              {resourceLinks.map(([label, href]) => (
                <Link className="border-b-2 border-[#04AAA0] pb-2 font-semibold text-white" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </article>
    </main>
  );
}
