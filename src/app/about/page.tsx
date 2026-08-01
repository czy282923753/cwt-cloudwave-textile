import type { Metadata } from "next";

import { PublicShell } from "@/public-site/shell";
import { TrackedLink } from "@/public-site/tracking";

export const metadata: Metadata = {
  title: "About CWT",
  description:
    "CloudWave Textile is a fabric supplier and textile sourcing partner connecting global buyers with multi-category resources in China.",
  alternates: { canonical: "/about/" },
};

const services = [
  [
    "01",
    "Fabric selection",
    "Narrow options across multiple materials, constructions, finishes, and commercial collections.",
  ],
  [
    "02",
    "Sourcing coordination",
    "Discuss requirements with suitable China textile supply resources without implying ownership of third-party facilities.",
  ],
  [
    "03",
    "Sampling & development",
    "Coordinate samples, development discussions, follow-up, and export requirements after the relevant facts are confirmed.",
  ],
] as const;

export default function AboutPage() {
  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden bg-[#143f38] py-24 text-white">
          <div className="site-container relative">
            <p className="eyebrow !text-[#9bd6c5]">About CloudWave Textile</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-7xl">
              A professional fabric supplier and textile sourcing partner in China.
            </h1>
          </div>
        </section>
        <section className="site-container grid gap-14 py-20 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="eyebrow">Who CWT is</p>
            <h2 className="section-title mt-4">
              Supplier and sourcing partner—not a single-product factory story.
            </h2>
          </div>
          <div className="prose-cwt text-lg">
            <p>
              CWT helps overseas brands, manufacturers, importers, wholesalers,
              trading companies, and sourcing teams describe and narrow their fabric
              requirements. A request may begin with a specification, application,
              photo, or physical sample reference.
            </p>
            <p>
              Public statements about company history, locations, facilities, partner
              relationships, certifications, scale, and production capability are shown
              only after evidence review and public-use approval.
            </p>
          </div>
        </section>
        <section className="border-y border-stone-200 bg-white py-20">
          <div className="site-container grid gap-6 md:grid-cols-3">
            {services.map(([number, title, description]) => (
              <article className="rounded-3xl bg-[#f4f0e5] p-7" key={number}>
                <span className="text-sm font-semibold text-[#a94426]">{number}</span>
                <h2 className="mt-8 text-2xl font-semibold text-[#143a34]">{title}</h2>
                <p className="mt-4 leading-7 text-stone-600">{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-container flex flex-wrap items-center justify-between gap-8 py-20">
          <div>
            <p className="eyebrow">Start with the requirement</p>
            <h2 className="section-title mt-4">Let CWT help find the next fabric option.</h2>
          </div>
          <TrackedLink
            className="button-primary"
            eventName="quote_cta_click"
            href="/get-quote/"
            placement="about_footer"
          >
            Find Your Fabric Solution
          </TrackedLink>
        </section>
      </main>
    </PublicShell>
  );
}
