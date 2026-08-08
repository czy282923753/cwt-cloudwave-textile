import Link from "next/link";

import type { PublicAsset } from "./data";
import { ResponsivePublicImage } from "./responsive-image";

export function ProductCard({
  product,
}: Readonly<{
  product: {
    name: string;
    shortDescription: string | null;
    path: string;
    image: PublicAsset | null;
    indexStatus: "index" | "noindex";
  };
}>) {
  return (
    <article className="surface-card surface-card--interactive group overflow-hidden">
      <Link href={product.path}>
        {product.image ? (
          <div className="relative aspect-[4/3] overflow-hidden bg-[#EAF4F5]">
            <ResponsivePublicImage asset={product.image} className="object-cover transition duration-500 group-hover:scale-[1.03]" fill sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        ) : null}
        <div className="p-5">
          {product.indexStatus === "noindex" && product.name.startsWith("TEST FIXTURE") ? <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Noindex test fixture</p> : null}
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#062E39]">{product.name}</h2>
          {product.shortDescription ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#586B73]">{product.shortDescription}</p> : null}
          <span className="mt-5 inline-flex text-sm font-semibold text-[#087B76]">View fabric →</span>
        </div>
      </Link>
    </article>
  );
}
