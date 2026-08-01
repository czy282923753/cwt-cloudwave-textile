import type { Metadata } from "next";

import { listPublishedProducts } from "@/public-site/data";
import { ProductCard } from "@/public-site/product-card";
import { PublicShell } from "@/public-site/shell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fabric Products",
  description:
    "Browse published CloudWave Textile fabric records across multiple material, construction, collection, and surface categories.",
  alternates: { canonical: "/products/" },
};

export default async function ProductsPage() {
  const products = await listPublishedProducts();
  return (
    <PublicShell>
      <main>
        <section className="border-b border-stone-200 bg-[#e6eee9] py-20">
          <div className="site-container"><p className="eyebrow">Product knowledge base</p><h1 className="section-title mt-4 max-w-4xl">Fabric records built around real supply references.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Explore available records across multiple product dimensions. Unknown specifications remain empty rather than being inferred.</p></div>
        </section>
        <section className="site-container py-16">
          {products.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-stone-600">No product records have passed publication yet.</div>}
        </section>
      </main>
    </PublicShell>
  );
}
