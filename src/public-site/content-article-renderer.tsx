import Image from "next/image";

import { BlockRenderer, type BlockMedia, type BlockRelatedLink } from "@/editorial/block-renderer";
import type { BlockDocument } from "@/editorial/blocks";

import { TrackedLink } from "./tracking";

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

export function ContentArticleRenderer({ content, channelTitle }: Readonly<{ content: ContentArticleViewModel; channelTitle: string }>) {
  return <main data-content-article={content.id}><article><header className="bg-[#eadfce] py-20"><div className="site-container max-w-4xl"><p className="eyebrow">{channelTitle}</p><h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#143a34] sm:text-6xl">{content.title}</h1>{content.excerpt ? <p className="mt-6 text-xl leading-8 text-stone-600">{content.excerpt}</p> : null}<p className="mt-8 text-sm text-stone-600">By {content.authorName}</p></div></header>{content.images[0] ? <div className="site-container max-w-5xl pt-12"><div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-stone-200"><Image alt={content.images[0].alt} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 960px" src={content.images[0].url} unoptimized /></div></div> : null}<div className="site-container max-w-4xl py-16"><BlockRenderer document={content.document} media={content.blockMedia} relatedArticles={content.relatedArticles} relatedProducts={content.relatedProducts} /><div className="mt-16 rounded-[2rem] bg-[#e6eee9] p-8"><h2 className="text-2xl font-semibold text-[#143a34]">Need help applying this to a real sourcing request?</h2><p className="mt-3 leading-7 text-stone-600">Share an application, description, or fabric image with CWT.</p><TrackedLink className="button-primary mt-6" eventName="quote_cta_click" href="/get-quote/" placement="article_footer">Find Your Fabric Solution</TrackedLink></div></div></article></main>;
}
