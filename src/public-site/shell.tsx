import Link from "next/link";

import { env } from "@/config/env";

import { TrackedLink } from "./tracking";

const resources = [
  ["Fabric Knowledge", "/fabric-knowledge"],
  ["China Textile Guide", "/china-textile-guide"],
  ["China Sourcing Guide", "/china-sourcing-guide"],
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#faf8f2]/95 backdrop-blur">
      <div className="site-container flex h-18 items-center justify-between gap-6">
        <Link className="flex items-center gap-3" href="/" aria-label="CloudWave Textile home">
          <span className="grid size-9 place-items-center rounded-full bg-[#164f46] text-sm font-bold text-white">CW</span>
          <span className="font-semibold tracking-[-0.02em] text-[#143a34]">CloudWave Textile</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm font-medium text-stone-700 lg:flex">
          <Link href="/products">Products</Link>
          <Link href="/applications">Applications</Link>
          <Link href="/fabric-library">Fabric Library</Link>
          <div className="group relative py-6">
            <Link href="/resources">Resources</Link>
            <div className="invisible absolute left-1/2 top-15 w-56 -translate-x-1/2 rounded-2xl border border-stone-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
              {resources.map(([label, href]) => <Link className="block rounded-xl px-3 py-2 hover:bg-stone-100" href={href} key={href}>{label}</Link>)}
            </div>
          </div>
          <Link href="/about">About CWT</Link>
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <TrackedLink className="button-primary" eventName="quote_cta_click" href="/get-quote" placement="header">Get Quote</TrackedLink>
        </div>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-stone-300 px-3 py-2 text-sm">Menu</summary>
          <nav className="absolute right-0 mt-3 grid w-64 gap-1 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl" aria-label="Mobile">
            <Link href="/products">Products</Link><Link href="/applications">Applications</Link><Link href="/fabric-library">Fabric Library</Link>{resources.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}<Link href="/about">About CWT</Link><Link className="mt-2 rounded-xl bg-[#164f46] px-4 py-3 text-center text-white" href="/get-quote">Get Quote</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#103e37] text-white">
      <div className="site-container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div><p className="text-xl font-semibold">CloudWave Textile</p><p className="mt-4 max-w-md text-sm leading-6 text-white/70">Professional Fabric Supplier &amp; Textile Sourcing Partner in China, supporting global buyers with multi-category sourcing and fabric matching.</p></div>
        <div><p className="font-semibold">Explore</p><div className="mt-4 grid gap-2 text-sm text-white/70"><Link href="/products">Products</Link><Link href="/applications">Applications</Link><Link href="/fabric-library">Fabric Library</Link></div></div>
        <div><p className="font-semibold">Knowledge</p><div className="mt-4 grid gap-2 text-sm text-white/70">{resources.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div></div>
      </div>
      <div className="border-t border-white/10"><div className="site-container flex flex-wrap justify-between gap-3 py-5 text-xs text-white/55"><span>© {new Date().getFullYear()} Guangzhou CloudWave Textile Co., Ltd.</span><span><Link href="/privacy">Privacy &amp; uploads</Link> · English at root</span></div></div>
    </footer>
  );
}

export function FloatingInquiryActions() {
  const digits = env.WHATSAPP_NUMBER.replace(/\D/g, "");
  return (
    <>
      <aside className="fixed bottom-8 right-6 z-30 hidden flex-col gap-2 md:flex" aria-label="Quick inquiry">
        {digits ? <TrackedLink className="rounded-full bg-[#1f8f65] px-5 py-3 text-sm font-semibold text-white shadow-lg" eventName="whatsapp_click" href={`https://wa.me/${digits}`} placement="desktop_float">WhatsApp</TrackedLink> : null}
        <TrackedLink className="rounded-full bg-[#e56d3f] px-5 py-3 text-sm font-semibold text-white shadow-lg" eventName="quote_cta_click" href="/get-quote" placement="desktop_float">Find Your Fabric</TrackedLink>
      </aside>
      <aside className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-stone-200 bg-white p-2 md:hidden" aria-label="Mobile quick inquiry">
        {digits ? <TrackedLink className="rounded-lg px-3 py-3 text-center text-sm font-semibold text-[#166348]" eventName="whatsapp_click" href={`https://wa.me/${digits}`} placement="mobile_bar">WhatsApp</TrackedLink> : <span className="px-3 py-3 text-center text-sm text-stone-400">CWT Sourcing</span>}
        <TrackedLink className="rounded-lg bg-[#e56d3f] px-3 py-3 text-center text-sm font-semibold text-white" eventName="quote_cta_click" href="/get-quote" placement="mobile_bar">Get Quote</TrackedLink>
      </aside>
    </>
  );
}

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><PublicHeader />{children}<PublicFooter /><FloatingInquiryActions /></>;
}
