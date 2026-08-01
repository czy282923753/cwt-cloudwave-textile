import Image from "next/image";
import Link from "next/link";

import type { PublicAsset } from "./data";

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
    <article className="group overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
      <Link href={product.path}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#e9e4d8]">
          {product.image ? <Image alt={product.image.alt} className="object-cover transition duration-500 group-hover:scale-[1.03]" fill sizes="(max-width: 768px) 100vw, 33vw" src={product.image.url} unoptimized /> : <div className="weave-placeholder h-full" aria-hidden="true" />}
        </div>
        <div className="p-5">
          {product.indexStatus === "noindex" && product.name.startsWith("TEST FIXTURE") ? <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Noindex test fixture</p> : null}
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#143a34]">{product.name}</h2>
          {product.shortDescription ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{product.shortDescription}</p> : null}
          <span className="mt-5 inline-flex text-sm font-semibold text-[#17695a]">View fabric →</span>
        </div>
      </Link>
    </article>
  );
}
