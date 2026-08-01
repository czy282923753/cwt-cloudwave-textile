import Link from "next/link";

import { requireCurrentUser } from "@/auth/current-user";

const areas = [
  ["Products", "/admin/products"],
  ["Applications", "/admin/applications"],
  ["Assets", "/admin/assets"],
  ["Contents", "/admin/contents"],
  ["Inquiries", "/admin/inquiries"],
] as const;

export default async function AdminHomePage() {
  await requireCurrentUser("admin.access");
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold">CWT operations</h1>
      <p className="mt-3 text-slate-300">
        Business rules, publishing, permissions, and audit remain server-owned.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map(([label, href]) => (
          <Link
            className="rounded-2xl border border-white/10 bg-slate-900 p-6 hover:border-teal-400"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </div>
    </main>
  );
}
