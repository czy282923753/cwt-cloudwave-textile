import Link from "next/link";

import { ResponsivePublicImage } from "@/public-site/responsive-image";
import type { PublicAssetVariant } from "@/public-site/data";

import type { BlockDocument } from "./blocks";

export interface BlockMedia {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  variants?: readonly PublicAssetVariant[];
}

export interface BlockRelatedLink {
  id: string;
  href: string;
  label: string;
}

export function BlockRenderer({
  document,
  media = {},
  relatedProducts = {},
  relatedArticles = {},
}: Readonly<{
  document: BlockDocument;
  media?: Readonly<Record<string, BlockMedia>>;
  relatedProducts?: Readonly<Record<string, BlockRelatedLink>>;
  relatedArticles?: Readonly<Record<string, BlockRelatedLink>>;
}>) {
  return (
    <div className="prose-cwt grid gap-7">
      {document.blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            const className = "scroll-mt-24 font-semibold tracking-[-0.025em] text-[#062E39]";
            const anchor = `block-${block.id}`;
            if (block.level === 2) return <h2 className={`${className} text-3xl`} id={anchor} key={block.id}>{block.text}</h2>;
            if (block.level === 3) return <h3 className={`${className} text-2xl`} id={anchor} key={block.id}>{block.text}</h3>;
            return <h4 className={`${className} text-xl`} id={anchor} key={block.id}>{block.text}</h4>;
          }
          case "paragraph":
            return <p className="whitespace-pre-line leading-8" key={block.id}>{block.text}</p>;
          case "image": {
            const item = media[block.mediaKey];
            if (!item) return null;
            return <figure key={block.id}><div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-stone-200"><ResponsivePublicImage asset={item} className="object-cover" fill sizes="(max-width: 1024px) 100vw, 800px" /></div>{item.caption ? <figcaption className="mt-3 text-sm text-stone-500">{item.caption}</figcaption> : null}</figure>;
          }
          case "gallery": {
            const items = block.mediaKeys.flatMap((key) => media[key] ? [media[key]] : []);
            if (!items.length) return null;
            return <div className="grid gap-4 sm:grid-cols-2" key={block.id}>{items.map((item) => <figure key={item.id}><div className="relative aspect-square overflow-hidden rounded-3xl bg-stone-200"><ResponsivePublicImage asset={item} className="object-cover" fill sizes="(max-width: 640px) 100vw, 50vw" /></div>{item.caption ? <figcaption className="mt-2 text-sm text-stone-500">{item.caption}</figcaption> : null}</figure>)}</div>;
          }
          case "specification_table":
            return <div className="overflow-x-auto" key={block.id}><table className="w-full border-collapse text-left"><caption className="sr-only">{block.caption ?? "Specifications"}</caption><tbody>{block.rows.map((row) => <tr className="border-b border-[#CCDDE1]" key={row.label}><th className="py-3 pr-6 font-semibold text-[#062E39]" scope="row">{row.label}</th><td className="py-3">{row.value}</td></tr>)}</tbody></table></div>;
          case "comparison_table":
            return <div className="overflow-x-auto" key={block.id}><table className="w-full border-collapse text-left"><caption className="sr-only">{block.caption ?? "Comparison"}</caption><thead><tr><th className="border-b border-stone-300 p-3" scope="col">Item</th>{block.columns.map((column) => <th className="border-b border-stone-300 p-3" key={column} scope="col">{column}</th>)}</tr></thead><tbody>{block.rows.map((row) => <tr className="border-b border-stone-200" key={row.label}><th className="p-3" scope="row">{row.label}</th>{row.cells.map((cell, index) => <td className="p-3" key={`${row.label}-${block.columns[index]}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
          case "feature_list":
          case "bullet_list":
            return <ul className={block.type === "feature_list" ? "grid gap-3 rounded-lg bg-[#EAF4F5] p-7" : "list-disc space-y-2 pl-6"} key={block.id}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
          case "callout":
            return <aside className="rounded-lg border-l-4 border-[#04AAA0] bg-[#EAF4F5] p-7" key={block.id}>{block.title ? <h3 className="text-xl font-semibold text-[#062E39]">{block.title}</h3> : null}<p className={`${block.title ? "mt-3 " : ""}whitespace-pre-line`}>{block.text}</p></aside>;
          case "quote":
            return <blockquote className="border-l-4 border-stone-300 pl-6 text-xl italic" key={block.id}><p className="whitespace-pre-line">{block.text}</p>{block.attribution ? <footer className="mt-3 text-sm not-italic text-stone-500">— {block.attribution}</footer> : null}</blockquote>;
          case "faq":
            return <section aria-label="Frequently asked questions" className="divide-y divide-[#CCDDE1]" key={block.id}>{block.items.map((item) => <details className="py-4" key={item.question}><summary className="cursor-pointer font-semibold text-[#062E39]">{item.question}</summary><p className="mt-3 whitespace-pre-line">{item.answer}</p></details>)}</section>;
          case "related_products":
          case "related_articles": {
            const records = block.type === "related_products" ? relatedProducts : relatedArticles;
            const ids = block.type === "related_products" ? block.productIds : block.contentIds;
            const links = ids.flatMap((id) => records[id] ? [records[id]] : []);
            if (!links.length) return null;
            return <nav aria-label={block.type === "related_products" ? "Related products" : "Related articles"} className="grid gap-3 sm:grid-cols-2" key={block.id}>{links.map((item) => <Link className="rounded border border-[#CCDDE1] p-5 font-semibold text-[#087B76]" href={item.href} key={item.id}>{item.label}</Link>)}</nav>;
          }
          case "cta":
            return <aside className="rounded-lg bg-[#062E39] p-8 text-white" key={block.id}>{block.supportingText ? <p className="mb-5 text-white/75">{block.supportingText}</p> : null}<Link className="button-on-deep" href={block.href}>{block.label}</Link></aside>;
          case "divider":
            return <hr className="border-stone-200" key={block.id} />;
        }
      })}
    </div>
  );
}
