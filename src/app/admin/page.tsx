import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveCurrentUser } from "@/auth/current-user";
import { hasPermission, type Permission } from "@/auth/permissions";
import {
  canAccessEditorialResource,
  type EditorialResourceKind,
} from "@/admin/preview-policy";

const areas: ReadonlyArray<readonly [string, string, Permission, EditorialResourceKind?]> = [
  ["Products", "/admin/products/", "products.read", "product"],
  ["Product Imports", "/admin/product-imports/", "products.import"],
  ["Taxonomy", "/admin/taxonomy/", "products.read"],
  ["Applications", "/admin/applications/", "products.read"],
  ["Assets", "/admin/assets/", "assets.read"],
  ["Fabric Library", "/admin/fabric-library/", "products.read"],
  ["Contents", "/admin/contents/", "content.read", "content"],
  ["Home Page Settings", "/admin/site/home/", "content.read", "static_page"],
  ["About CWT Settings", "/admin/site/about/", "content.read", "static_page"],
  ["Authors", "/admin/authors/", "content.read"],
  ["Company Facts", "/admin/company-facts/", "company_facts.manage"],
  ["SEO Routes", "/admin/seo/", "seo.manage"],
  ["Inquiries", "/admin/inquiries/", "inquiries.read"],
  ["Contacts", "/admin/contacts/", "users.manage"],
  ["Audit Log", "/admin/audit/", "audit.read"],
  ["Settings", "/admin/settings/", "settings.manage"],
];

export default async function AdminHomePage() {
  const user = await resolveCurrentUser();
  if (!user) redirect("/operations-login");
  const visibleAreas = areas.filter(([, , permission, resource]) =>
    hasPermission(user.role, permission) &&
    (!resource || canAccessEditorialResource(user.role, resource, "manage")),
  );
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold">CWT operations</h1>
      <p className="mt-3 text-slate-300">
        Business rules, publishing, permissions, and audit remain server-owned.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAreas.map(([label, href]) => (
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
