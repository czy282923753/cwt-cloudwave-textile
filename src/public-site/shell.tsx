import Image from "next/image";
import Link from "next/link";

import { PUBLIC_CONTACT_INFORMATION } from "@/config/public-contact-information";
import { getVerifiedPublicCompanyFacts } from "./data";

import { PublicContactInformation } from "./public-contact-information";
import { TrackedLink } from "./tracking";

const resources = [
  ["Fabric Knowledge", "/fabric-knowledge/"],
  ["China Textile Guide", "/china-textile-guide/"],
  ["China Sourcing Guide", "/china-sourcing-guide/"],
] as const;

const primaryLinks = [
  ["Products", "/products/"],
  ["Applications", "/applications/"],
  ["Fabric Library", "/fabric-library/"],
] as const;

function OfficialLogo() {
  return (
    <Image
      alt=""
      className="official-logo"
      data-cwt-official-logo="true"
      height={555}
      priority
      src="/CWTLOGO.svg"
      width={1929}
    />
  );
}

export function PublicHeader() {
  return (
    <header className="public-header" data-public-header="true">
      <div className="public-header__inner site-container">
        <Link
          aria-label="CloudWave Textile home"
          className="official-logo-link"
          data-navigation-logo-only="true"
          href="/"
        >
          <OfficialLogo />
        </Link>

        <div className="desktop-actions">
          <nav aria-label="Primary" className="desktop-navigation">
            {primaryLinks.map(([label, href]) => (
              <Link className="desktop-navigation__link" href={href} key={href}>
                {label}
              </Link>
            ))}
            <div className="desktop-resources">
              <Link
                aria-haspopup="true"
                className="desktop-navigation__link"
                href="/resources/"
              >
                Fabric &amp; Sourcing
              </Link>
              <nav
                aria-label="Fabric and sourcing resources"
                className="desktop-resources__menu"
              >
                {resources.map(([label, href]) => (
                  <Link href={href} key={href}>{label}</Link>
                ))}
              </nav>
            </div>
            <Link className="desktop-navigation__link" href="/about/">About CWT</Link>
          </nav>

          <TrackedLink
            className="button-primary header-cta"
            eventName="quote_cta_click"
            href="/get-quote/"
            placement="header"
          >
            Get a Quote
          </TrackedLink>
        </div>

        <details className="mobile-navigation">
          <summary>
            <span className="sr-only mobile-navigation__label-open">Open navigation menu</span>
            <span className="sr-only mobile-navigation__label-close">Close navigation menu</span>
            <span aria-hidden="true" className="mobile-navigation__icon mobile-navigation__open">
              <span />
            </span>
            <span aria-hidden="true" className="mobile-navigation__icon mobile-navigation__close" />
          </summary>
          <div className="mobile-navigation__panel">
            <nav aria-label="Mobile" className="mobile-navigation__links">
              {primaryLinks.map(([label, href]) => (
                <Link href={href} key={href}>{label}</Link>
              ))}
              <div className="mobile-navigation__group">
                <Link className="mobile-navigation__group-label" href="/resources/">
                  Fabric &amp; Sourcing
                </Link>
                {resources.map(([label, href]) => (
                  <Link className="mobile-navigation__sublink" href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
              <Link href="/about/">About CWT</Link>
            </nav>
            <div className="mobile-navigation__action">
              <TrackedLink
                className="button-on-deep"
                eventName="quote_cta_click"
                href="/get-quote/"
                placement="mobile_menu"
              >
                Get a Quote
              </TrackedLink>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

export async function PublicFooter() {
  const facts = await getVerifiedPublicCompanyFacts();
  const legalName = facts.get("legal_entity_name");
  return (
    <footer className="deep-section">
      <div className="public-footer__grid site-container grid gap-10 py-14">
        <div>
          <Link
            aria-label="CloudWave Textile home"
            className="inline-flex rounded bg-white px-3 py-2"
            href="/"
          >
            <OfficialLogo />
          </Link>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
            Professional Fabric Supplier &amp; Textile Sourcing Partner in China,
            supporting global buyers with multi-category sourcing and fabric matching.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Explore</p>
          <div className="mt-4 grid gap-2 text-sm text-white/75">
            <Link href="/products/">Products</Link>
            <Link href="/applications/">Applications</Link>
            <Link href="/fabric-library/">Fabric Library</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Knowledge</p>
          <div className="mt-4 grid gap-2 text-sm text-white/75">
            {resources.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">Contact</p>
          <PublicContactInformation variant="footer" />
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="site-container flex flex-wrap justify-between gap-3 py-5 text-xs text-white/65">
          <span>© {new Date().getFullYear()} {legalName ?? "CloudWave Textile"}</span>
          <span><Link href="/privacy/">Privacy &amp; uploads</Link> · English at root</span>
        </div>
      </div>
    </footer>
  );
}

export function FloatingInquiryActions() {
  const whatsappHref = PUBLIC_CONTACT_INFORMATION.whatsapp.href;
  return (
    <>
      <aside className="fixed bottom-8 right-6 z-30 hidden flex-col gap-2 md:flex" aria-label="Quick inquiry">
        <TrackedLink
          className="rounded-full bg-[#2F6E97] px-5 py-3 text-sm font-semibold text-white shadow-lg"
          eventName="whatsapp_click"
          href={whatsappHref}
          placement="desktop_float"
        >
          WhatsApp
        </TrackedLink>
        <TrackedLink
          className="button-primary rounded-full"
          eventName="quote_cta_click"
          href="/get-quote/"
          placement="desktop_float"
        >
          Find Your Fabric
        </TrackedLink>
      </aside>
      <aside className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-[#CCDDE1] bg-white p-2 md:hidden" aria-label="Mobile quick inquiry">
        <TrackedLink
          className="rounded px-3 py-3 text-center text-sm font-semibold text-[#2F6E97]"
          eventName="whatsapp_click"
          href={whatsappHref}
          placement="mobile_bar"
        >
          WhatsApp
        </TrackedLink>
        <TrackedLink
          className="rounded bg-[#087B76] px-3 py-3 text-center text-sm font-semibold text-white"
          eventName="quote_cta_click"
          href="/get-quote/"
          placement="mobile_bar"
        >
          Get Quote
        </TrackedLink>
      </aside>
    </>
  );
}

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><PublicHeader />{children}<PublicFooter /><FloatingInquiryActions /></>;
}
