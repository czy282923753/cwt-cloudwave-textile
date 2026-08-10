import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedProductPage } from "@/public-site/data";
import { ProductCard } from "@/public-site/product-card";
import { parseProductPage, productPageHref } from "@/public-site/product-pagination";
import { PublicShell } from "@/public-site/shell";
import { staticPageRobots } from "@/seo/page-indexability";

export const revalidate = 3600;

export async function generateMetadata({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string | string[] }>;
}>): Promise<Metadata> {
  const page = parseProductPage((await searchParams).page);
  const productPage = page ? await getPublishedProductPage(page) : null;
  return {
    title: "Fabric Products",
    description:
      "Browse published CloudWave Textile fabric records across multiple material, construction, collection, and surface categories.",
    alternates: { canonical: page ? productPageHref(page) : "/products/" },
    robots: productPage
      ? staticPageRobots(productPage.total > 0)
      : { index: false, follow: false },
  };
}

export default async function ProductsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string | string[] }>;
}>) {
  const pageNumber = parseProductPage((await searchParams).page);
  if (!pageNumber) notFound();
  const productPage = await getPublishedProductPage(pageNumber);
  if (!productPage) notFound();
  const pageLinks = [...new Set([
    1,
    productPage.totalPages,
    pageNumber - 2,
    pageNumber - 1,
    pageNumber,
    pageNumber + 1,
    pageNumber + 2,
  ].filter((page) => page >= 1 && page <= productPage.totalPages))].sort((a, b) => a - b);
  return (
    <PublicShell>
      <main>
        <section className="page-hero page-hero--compact">
          <div className="site-container py-16"><p className="eyebrow">Product knowledge base</p><h1 className="section-title mt-4 max-w-4xl">Fabric records built around real supply references.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#586B73]">Explore available records across multiple product dimensions. Unknown specifications remain empty rather than being inferred.</p></div>
        </section>
        <section className="site-container py-16">
          {productPage.items.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{productPage.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded border border-dashed border-[#B8CDD2] p-10 text-[#586B73]">No product records have passed publication yet.</div>}
          {productPage.totalPages > 1 ? <nav aria-label="Product pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {pageNumber > 1 ? <Link className="button-secondary" href={productPageHref(pageNumber - 1)} rel="prev">Previous</Link> : null}
            {pageLinks.map((page, index) => <span className="contents" key={page}>{index > 0 && page - pageLinks[index - 1]! > 1 ? <span aria-hidden="true" className="px-1 text-[#586B73]">…</span> : null}<Link aria-current={page === pageNumber ? "page" : undefined} className={page === pageNumber ? "rounded-full bg-[#087B76] px-4 py-2 text-white" : "rounded-full border border-[#B8CDD2] px-4 py-2 text-[#062E39]"} href={productPageHref(page)}>{page}</Link></span>)}
            {pageNumber < productPage.totalPages ? <Link className="button-secondary" href={productPageHref(pageNumber + 1)} rel="next">Next</Link> : null}
          </nav> : null}
        </section>
      </main>
    </PublicShell>
  );
}
