import type { Metadata } from "next";
import Link from "next/link";

import { BrandWaveMotif } from "@/public-site/brand-wave-motif";
import { InquiryForm } from "@/public-site/inquiry-form";
import { PublicShell } from "@/public-site/shell";

export const metadata: Metadata = {
  title: "Find Your Fabric Solution",
  description: "Send CloudWave Textile a fabric description, reference image, or both. Name and Email are the only required identity fields.",
  alternates: { canonical: "/get-quote/" },
};

export default async function GetQuotePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ product?: string }>;
}>) {
  const { product } = await searchParams;
  const initialDescription = product ? `I am interested in: ${product}` : "";
  return (
    <PublicShell>
      <main>
        <section className="page-hero page-hero--compact">
          <div className="page-hero__layout site-container">
            <div>
              <p className="eyebrow">Inquiry</p>
              <h1 className="section-title mt-5">Find Your Fabric Solution</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#586B73]">
                Upload a fabric image, describe the requirement, or do both.
              </p>
            </div>
            <BrandWaveMotif compact />
          </div>
        </section>

        <section className="site-container grid gap-6 py-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.7fr)] lg:py-16">
          <div className="surface-card p-6 sm:p-9" id="upload">
            <h2 className="text-2xl font-semibold text-[#062E39]">Inquiry Details</h2>
            <p className="mt-2 text-sm leading-6 text-[#586B73]">
              Name and Email are required. Add a description, a private reference image, or both.
            </p>
            <div className="mt-7">
              <InquiryForm initialDescription={initialDescription} />
            </div>
          </div>

          <aside
            className="deep-section self-start rounded-lg p-6 lg:sticky lg:top-24"
            data-scheme4-zone="inquiry-guidance"
          >
            <h2 className="text-2xl font-semibold text-white">Before you submit</h2>
            <span aria-hidden="true" className="mt-3 block h-0.5 w-12 bg-[#04AAA0]" />
            <ul className="mt-7 grid gap-6 text-sm leading-6 text-white/80">
              <li className="grid grid-cols-[2rem_1fr] items-start gap-3">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[#2F6E97] text-white">1</span>
                <span>Name and Email are required.</span>
              </li>
              <li className="grid grid-cols-[2rem_1fr] items-start gap-3">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[#2F6E97] text-white">2</span>
                <span>You may add a description or a private reference image.</span>
              </li>
              <li className="grid grid-cols-[2rem_1fr] items-start gap-3">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[#2F6E97] text-white">3</span>
                <span>Uploaded customer files remain separate from public Assets.</span>
              </li>
            </ul>
            <Link className="mt-7 inline-flex border border-[#04AAA0] px-4 py-2 text-sm font-semibold text-[#8EE2DC]" href="/privacy/">
              Privacy &amp; uploads
            </Link>
            <BrandWaveMotif className="-mx-6 -mb-6 mt-4 opacity-80" compact dark />
          </aside>
        </section>
      </main>
    </PublicShell>
  );
}
