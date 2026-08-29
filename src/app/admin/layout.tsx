import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RefineAdminProvider } from "@/admin/refine/refine-admin-provider";
import { resolveCurrentUser } from "@/auth/current-user";
import { hasPermission, requirePermission } from "@/auth/permissions";
import { canAccessEditorialResource } from "@/admin/preview-policy";

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
  const editorialResources = (["product", "content", "static_page", "email_template"] as const).filter(
    (resource) => canAccessEditorialResource(user.role, resource, "manage"),
  );
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm sm:px-6">
        <span className="min-w-0 break-words">CWT Operations · {user.displayName}</span>
        <form action="/api/auth/logout/" method="post">
          <button className="rounded-lg border border-white/20 px-3 py-2" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <RefineAdminProvider canImportProducts={hasPermission(user.role, "products.import")} editorialResources={editorialResources}>{children}</RefineAdminProvider>
    </div>
  );
}
