import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApplications } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Fabric Applications",
  description: "Explore fabric sourcing by end use, from sportswear and activewear to fashion, underwear, and home textile applications.",
  alternates: { canonical: "/applications" },
};

export default async function ApplicationsPage() {
  const applications = await listPublishedApplications();
  return (
    <PublicShell><main><section className="bg-[#143f38] py-20 text-white"><div className="site-container"><p className="eyebrow !text-[#9bd6c5]">End-use discovery</p><h1 className="section-title mt-4 max-w-4xl !text-white">Find fabric through the product you plan to make.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Applications remain separate from fiber, construction, commercial collection, and surface characteristics.</p></div></section><section className="site-container grid gap-6 py-16 md:grid-cols-2 lg:grid-cols-3">{applications.map((application, index) => <Link className="rounded-[1.5rem] border border-stone-200 bg-white p-7 hover:-translate-y-1 hover:shadow-lg" href={application.path} key={application.id}><span className="text-sm font-semibold text-[#a94426]">0{index + 1}</span><h2 className="mt-8 text-2xl font-semibold text-[#143a34]">{application.name}</h2>{application.shortDescription ? <p className="mt-4 leading-7 text-stone-600">{application.shortDescription}</p> : null}<span className="mt-8 inline-flex text-sm font-semibold text-[#17695a]">Explore application →</span></Link>)}{applications.length === 0 ? <p className="text-stone-600">No Applications have passed publication review.</p> : null}</section></main></PublicShell>
  );
}
