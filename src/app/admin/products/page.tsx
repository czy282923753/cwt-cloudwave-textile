import Link from "next/link";

import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminProducts } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminProductsPage() {
  await requireCurrentUser("products.read");
  const products = await listAdminProducts();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        action={
          <Link className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" href="/admin/products/new">
            New Product Draft
          </Link>
        }
        description="Real Product records only. Publication and indexability remain separate decisions."
        title="Products"
      />
      <AdminTable
        headers={["Product", "Status", "Index", "Route", "Updated"]}
        rows={products.map((product) => [
          <Link className="text-teal-300" href={`/admin/products/${product.id}`} key={product.id}>
            {product.name}
          </Link>,
          product.status,
          product.indexStatus ?? "noindex",
          product.path ?? "—",
          product.updatedAt.toLocaleString("en-GB"),
        ])}
      />
    </main>
  );
}
