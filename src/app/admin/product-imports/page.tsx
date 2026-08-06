import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { ProductImportWizard } from "@/admin/components/product-import-wizard";
import { resolveCurrentUser } from "@/auth/current-user";
import { hasPermission } from "@/auth/permissions";
import { databaseConnection } from "@/db/client";
import { isProductImportEnabled, listProductImportBatches } from "@/imports/service";

export default async function ProductImportsPage() {
  const user = await resolveCurrentUser();
  if (!user) redirect("/operations-login");
  if (!hasPermission(user.role, "products.import")) notFound();
  const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
  const enabled = databaseConnection.kind === "pglite"
    ? await isProductImportEnabled(databaseConnection.db)
    : await isProductImportEnabled(databaseConnection.db);
  const batches = enabled
    ? databaseConnection.kind === "pglite"
      ? await listProductImportBatches(databaseConnection.db, actor)
      : await listProductImportBatches(databaseConnection.db, actor)
    : [];
  return <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
    <AdminPageHeader action={<a className="rounded-xl border border-teal-300 px-4 py-3 text-teal-200" href="/api/admin/product-imports/template/">Download Template V1</a>} description="Create and Update are separate immutable modes. Import creates Drafts or pending Revisions only; it never Publishes or enables Index." title="Product Import" />
    <ProductImportWizard enabled={enabled} />
    {enabled ? <section aria-labelledby="import-history"><h2 className="mb-4 text-xl font-semibold" id="import-history">Durable import history</h2><AdminTable headers={["Batch", "Mode", "Status", "Created"]} rows={batches.map((batch) => [
      <Link className="text-teal-300" href={`/admin/product-imports/${batch.id}/`} key={batch.id}>{batch.id.slice(0, 8)}</Link>,
      batch.mode,
      batch.status,
      batch.createdAt.toLocaleString("en-GB"),
    ])} /></section> : null}
  </main>;
}
