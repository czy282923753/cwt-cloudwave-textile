import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/public-site/shell";

export const metadata: Metadata = { title: "Fabric & Sourcing Resources", description: "Explore CloudWave Textile resources across fabric knowledge, China's textile industry, and sourcing from China.", alternates: { canonical: "/resources/" } };

export default function ResourcesPage() {
  const resources = [
    ["Fabric Knowledge", "/fabric-knowledge/", "Understand materials, measurements, structures, comparisons, selection, and common fabric terminology."],
    ["China Textile Guide", "/china-textile-guide/", "Learn about China's textile ecosystem, regional clusters, markets, and supply-chain context."],
    ["China Sourcing Guide", "/china-sourcing-guide/", "Plan supplier selection, sampling, development, MOQ conversations, and export coordination."],
  ] as const;
  return <PublicShell><main><section className="bg-[#eadfce] py-20"><div className="site-container"><p className="eyebrow">CWT knowledge system</p><h1 className="section-title mt-4">Fabric and China sourcing resources</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">Three independent content directions, connected through topic clusters, products, Applications, and governed internal links.</p></div></section><section className="site-container grid gap-6 py-16 md:grid-cols-3">{resources.map(([title, href, description], index) => <Link className="rounded-[2rem] border border-stone-200 bg-white p-8 hover:-translate-y-1 hover:shadow-lg" href={href} key={href}><span className="text-sm font-semibold text-[#a94426]">0{index + 1}</span><h2 className="mt-10 text-2xl font-semibold text-[#143a34]">{title}</h2><p className="mt-4 leading-7 text-stone-600">{description}</p><span className="mt-8 inline-flex font-semibold text-[#17695a]">Explore →</span></Link>)}</section></main></PublicShell>;
}
