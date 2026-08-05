import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProductPreviewModel } from "@/admin/preview-data";
import { requireCurrentUser } from "@/auth/current-user";
import { ProductDetailRenderer } from "@/public-site/product-detail-renderer";
import { PublicShell } from "@/public-site/shell";

export const metadata: Metadata = { title: "Product Draft Preview", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";

export default async function ProductPreviewPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireCurrentUser("products.read");
  const { id } = await params;
  const product = await getProductPreviewModel(id);
  if (!product) notFound();
  return <><div className="bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">Authenticated Product Draft/Revision Preview · noindex · not public eligibility</div><PublicShell><ProductDetailRenderer product={product} /></PublicShell></>;
}
