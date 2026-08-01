import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RefineAdminProvider } from "@/admin/refine/refine-admin-provider";
import { resolveCurrentUser } from "@/auth/current-user";
import { requirePermission } from "@/auth/permissions";

export const metadata: Metadata = {
  title: "CWT Operations",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await resolveCurrentUser();
  if (!user) redirect("/operations-login");
  requirePermission(user.role, "admin.access");
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3 text-sm">
        <span>CWT Operations · {user.displayName}</span>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-lg border border-white/20 px-3 py-2" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <Suspense fallback={<p className="p-6">Loading CWT Operations…</p>}>
        <RefineAdminProvider>{children}</RefineAdminProvider>
      </Suspense>
    </div>
  );
}
