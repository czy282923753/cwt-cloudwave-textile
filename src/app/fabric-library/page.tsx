import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedFabricEntries } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { ResponsivePublicImage } from "@/public-site/responsive-image";
import { staticPageRobots } from "@/seo/page-indexability";

export const revalidate = 3600;

export async function generateMetadata({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string }> }>): Promise<Metadata> {
  const { q } = await searchParams;
  const entries = await listPublishedFabricEntries();
  return {
    title: "Fabric Library",
    description: "Browse CloudWave Textile's visual library of published fabric references and related product records.",
    alternates: { canonical: "/fabric-library/" },
    robots: q ? staticPageRobots(false) : staticPageRobots(entries.length > 0),
  };
}

export default async function FabricLibraryPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const { q } = await searchParams;
  const entries = await listPublishedFabricEntries();
  const normalized = q?.trim().toLowerCase() ?? "";
  const filtered = normalized ? entries.filter((entry) => `${entry.title} ${entry.description ?? ""}`.toLowerCase().includes(normalized)) : entries;
  return (
    <PublicShell>
      <main>
        <section className="page-hero py-20">
          <div className="site-container">
            <p className="eyebrow">Visual discovery</p>
            <h1 className="section-title mt-4">Fabric Library</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#586B73]">Browse real uploaded fabric references. A visual Entry remains distinct from both the Product record and the underlying Asset.</p>
            <form className="mt-8 flex max-w-xl gap-2" method="get">
              <label className="sr-only" htmlFor="library-search">Search library</label>
              <input className="min-w-0 flex-1 rounded border border-[#B8CDD2] bg-white px-5 py-3 text-base text-[#062E39]" defaultValue={q} id="library-search" name="q" placeholder="Search visual entries" />
              <button className="button-primary" type="submit">Search</button>
            </form>
            {q ? <p className="mt-3 text-sm text-[#586B73]">Search results are Noindex. <Link className="underline" href="/fabric-library/">Clear search</Link></p> : null}
          </div>
        </section>
        <section className="site-container py-16">
          {filtered.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry) => (
                <Link className="surface-card surface-card--interactive group overflow-hidden p-5" href={entry.path} key={entry.id}>
                  {entry.image ? (
                    <div className="relative aspect-square overflow-hidden rounded bg-[#EAF4F5]">
                      <ResponsivePublicImage asset={entry.image} className="object-cover transition duration-500 group-hover:scale-[1.03]" fill sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>
                  ) : null}
                  <h2 className={`${entry.image ? "mt-4 " : ""}text-xl font-semibold text-[#062E39]`}>{entry.title}</h2>
                  {entry.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#586B73]">{entry.description}</p> : null}
                </Link>
              ))}
            </div>
          ) : <p className="text-[#586B73]">No published Fabric Library entries match this view.</p>}
        </section>
      </main>
    </PublicShell>
  );
}
