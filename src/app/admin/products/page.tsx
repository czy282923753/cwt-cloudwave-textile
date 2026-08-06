import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminProducts } from "@/admin/data";
import { resolveCurrentUser } from "@/auth/current-user";
import { canAccessEditorialResource } from "@/admin/preview-policy";

export default async function AdminProductsPage() {
  const user = await resolveCurrentUser();
  if (!user || !canAccessEditorialResource(user.role, "product", "manage")) notFound();
  const products = await listAdminProducts(user.role);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        action={canAccessEditorialResource(user.role, "product", "write") ?
          <Link className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" href="/admin/products/new">
            New Product Draft
          </Link> : null
        }
        description="Real Product records only. Publication and indexability remain separate decisions."
        title="Products"
      />
      <AdminTable
        headers={["Product", "Status", "Remediation", "Index", "Route", "Updated"]}
        rows={products.map((product) => [
          <Link className="text-teal-300" href={`/admin/products/${product.id}`} key={product.id}>
            {product.name}
          </Link>,
          product.status,
          product.publicationRemediationRequired
            ? product.publicationRemediationReason ?? "Publication review required"
            : "—",
          product.indexStatus ?? "noindex",
          product.path ?? "—",
          product.updatedAt.toLocaleString("en-GB"),
        ])}
      />
    </main>
  );
}
