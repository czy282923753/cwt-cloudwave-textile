import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedApplications } from "@/public-site/data";
import { PublicShell } from "@/public-site/shell";
import { staticPageRobots } from "@/seo/page-indexability";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const applications = await listPublishedApplications();
  return {
    title: "Fabric Applications",
    description: "Explore fabric sourcing by end use, from sportswear and activewear to fashion, underwear, and home textile applications.",
    alternates: { canonical: "/applications/" },
    robots: staticPageRobots(applications.length > 0),
  };
}

export default async function ApplicationsPage() {
  const applications = await listPublishedApplications();
  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="site-container py-20">
            <p className="eyebrow">End-use discovery</p>
            <h1 className="section-title mt-4 max-w-4xl">Find fabric through the product you plan to make.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#586B73]">Applications remain separate from fiber, construction, commercial collection, and surface characteristics.</p>
          </div>
        </section>
        <section className="site-container grid gap-6 py-16 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((application, index) => (
            <Link className="surface-card surface-card--interactive p-7" href={application.path} key={application.id}>
              <span className="text-sm font-semibold text-[#2F6E97]">0{index + 1}</span>
              <h2 className="mt-8 text-2xl font-semibold text-[#062E39]">{application.name}</h2>
              {application.shortDescription ? <p className="mt-4 leading-7 text-[#586B73]">{application.shortDescription}</p> : null}
              <span className="mt-8 inline-flex text-sm font-semibold text-[#087B76]">Explore application →</span>
            </Link>
          ))}
          {applications.length === 0 ? <p className="text-[#586B73]">No Applications have passed publication review.</p> : null}
        </section>
      </main>
    </PublicShell>
  );
}
