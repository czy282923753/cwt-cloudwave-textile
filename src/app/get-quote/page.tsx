import type { Metadata } from "next";

import { InquiryForm } from "@/public-site/inquiry-form";
import { PublicShell } from "@/public-site/shell";

export const metadata: Metadata = { title: "Find Your Fabric Solution", description: "Send CloudWave Textile a fabric description, reference image, or both. Name and Email are the only required identity fields.", alternates: { canonical: "/get-quote/" } };

export default async function GetQuotePage({ searchParams }: Readonly<{ searchParams: Promise<{ product?: string }> }>) {
  const { product } = await searchParams;
  const initialDescription = product ? `I am interested in: ${product}` : "";
  return <PublicShell><main><section className="bg-[#eadfce] py-20"><div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">Low-friction fabric inquiry</p><h1 className="section-title mt-4">Find Your Fabric Solution</h1><p className="mt-6 text-lg leading-8 text-stone-600">Upload a fabric image, describe the requirement, or do both. You do not need to complete a long buyer questionnaire before CWT can review the request.</p><div className="mt-8 grid gap-3 text-sm text-stone-600"><p>✓ Name and Email required</p><p>✓ Description or image required</p><p>✓ Country and WhatsApp optional</p><p>✓ Uploaded customer files stay private</p></div></div><div className="rounded-[2rem] bg-[#faf8f2] p-6 shadow-sm sm:p-10" id="upload"><InquiryForm initialDescription={initialDescription} /></div></div></section></main></PublicShell>;
}
