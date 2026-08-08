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
  return (
    <PublicShell>
      <main>
        <section className="page-hero py-20">
          <div className="site-container"><p className="eyebrow">CWT knowledge system</p><h1 className="section-title mt-4">Fabric and China sourcing resources</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[#586B73]">Three independent content directions, connected through topic clusters, products, Applications, and governed internal links.</p></div>
        </section>
        <section className="site-container grid gap-6 py-16 md:grid-cols-3">
          {resources.map(([title, href, description], index) => (
            <Link className="surface-card surface-card--interactive p-8" href={href} key={href}>
              <span className="text-sm font-semibold text-[#2F6E97]">0{index + 1}</span>
              <h2 className="mt-10 text-2xl font-semibold text-[#062E39]">{title}</h2>
              <p className="mt-4 leading-7 text-[#586B73]">{description}</p>
              <span className="mt-8 inline-flex font-semibold text-[#087B76]">Explore →</span>
            </Link>
          ))}
        </section>
      </main>
    </PublicShell>
  );
}
