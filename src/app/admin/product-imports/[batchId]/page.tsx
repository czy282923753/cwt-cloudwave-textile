import { notFound, redirect } from "next/navigation";

import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { ProductImportApply } from "@/admin/components/product-import-apply";
import { ProductImportRowCorrection } from "@/admin/components/product-import-row-correction";
import { resolveCurrentUser } from "@/auth/current-user";
import { hasPermission } from "@/auth/permissions";
import { databaseConnection } from "@/db/client";
import { getProductImportBatch } from "@/imports/service";

export default async function ProductImportDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const user = await resolveCurrentUser();
  if (!user) redirect("/operations-login");
  if (!hasPermission(user.role, "products.import")) notFound();
  const { batchId } = await params;
  const actor = { userId: user.id, role: user.role, authSessionId: user.sessionId } as const;
  const result = databaseConnection.kind === "pglite"
    ? await getProductImportBatch(databaseConnection.db, actor, batchId)
    : await getProductImportBatch(databaseConnection.db, actor, batchId);
  const rows = result.items.filter((item) => item.kind === "row");
  const errors = rows.filter((item) => item.status === "error").length;
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <AdminPageHeader action={<div className="flex flex-wrap gap-3">{result.batch.status === "validated" ? <><ProductImportApply batchId={batchId} /><ProductImportApply batchId={batchId} cancel /></> : null}{result.batch.status === "applying" ? <ProductImportApply batchId={batchId} resume /> : null}{result.batch.status === "completed" && errors ? <ProductImportApply batchId={batchId} retry /> : null}{errors ? <a className="rounded-xl border border-white/20 px-4 py-3" href={`/api/admin/product-imports/${batchId}/errors/`}>Export Row Errors</a> : null}</div>} description={`Mode ${result.batch.mode} · ${rows.length} Product rows · ${errors} Row Errors. Successful items are immutable and are never replayed.`} title={`Import ${batchId.slice(0, 8)}`} />
    {result.batch.status === "applying" ? <p className="mb-6 rounded-xl border border-amber-300/30 bg-amber-950/30 p-4 text-amber-100" role="status">This Import was still applying when the page loaded. Refresh for its durable result, or resume the existing Apply safely. Completed rows will not run again.</p> : null}
    <div aria-live="polite" className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status">{[...(["valid", "applied", "error", "skipped", "pending"] as const).map((status) => ({ label: status, value: result.counts[status] ?? 0 })), { label: "unmatched images", value: result.unmatchedImages }].map((summary) => <div className="rounded-xl border border-white/10 bg-slate-900 p-4" key={summary.label}><div className="text-xs uppercase text-slate-400">{summary.label}</div><div className="text-2xl font-semibold">{summary.value}</div></div>)}</div>
    <AdminTable headers={["Row", "Product Code", "Status", "Warnings", "Safe result"]} rows={rows.map((item) => {
      const raw = item.rawData as { productCode?: unknown; name?: unknown };
      return [item.rowNumber ?? "—", typeof raw.productCode === "string" ? raw.productCode : typeof raw.name === "string" ? raw.name : "—", item.status, Array.isArray(item.warningCodes) ? item.warningCodes.join(", ") || "—" : "—", <div key={item.id}>{item.errorDetail ?? (item.targetProductId ? `Product ${item.targetProductId.slice(0, 8)}` : "Ready for explicit Apply")}{item.status === "error" && item.errorCode !== "row_apply_failed" ? <ProductImportRowCorrection batchId={batchId} itemId={item.id} raw={raw} /> : null}</div>];
    })} />
  </main>;
}
