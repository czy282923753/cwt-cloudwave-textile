import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import { RetryableAssetBatches } from "@/admin/components/retryable-asset-batches";
import {
  listAdminAssets,
  listAdminContents,
  listAdminFabricEntries,
  listAdminProducts,
} from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import { hasPermission } from "@/auth/permissions";
import { databaseConnection } from "@/db/client";
import { createObjectStorage } from "@/storage";
import { listRetryableAdminUploadBatches } from "@/uploads/admin-upload-service";
import Link from "next/link";

export default async function AdminAssetsPage() {
  const user = await requireCurrentUser("assets.read");
  const canWriteAssets = hasPermission(user.role, "assets.write");
  const retryableBatchesPromise = canWriteAssets
    ? databaseConnection.kind === "pglite"
      ? listRetryableAdminUploadBatches(
          databaseConnection.db,
          createObjectStorage(),
          { userId: user.id, role: user.role, authSessionId: user.sessionId },
        )
      : listRetryableAdminUploadBatches(
          databaseConnection.db,
          createObjectStorage(),
          { userId: user.id, role: user.role, authSessionId: user.sessionId },
        )
    : Promise.resolve([]);
  const [retryableBatches, assets, products, contents, fabricEntries] = await Promise.all([
    retryableBatchesPromise,
    listAdminAssets(),
    listAdminProducts(),
    listAdminContents(),
    listAdminFabricEntries(),
  ]);
  const associations = [
    ...products.map((product) => ({ value: `product:${product.id}`, label: product.name, group: "Product" })),
    ...fabricEntries.map((entry) => ({ value: `fabric:${entry.id}`, label: entry.title, group: "Fabric Entry" })),
    ...contents.map((content) => ({ value: `content:${content.id}`, label: content.title, group: "Content" })),
  ];
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="Ordinary uploads keep Source Declaration OFF. Inquiry files use a separate private flow and never appear here."
        title="Asset Library"
      />
      <RetryableAssetBatches batches={retryableBatches} />
      <div className="grid gap-8 xl:grid-cols-[1fr_32rem]">
        <AdminTable
          headers={["File", "Category", "Access", "Status", "Declaration"]}
          rows={assets.map((asset) => [
            <Link className="text-teal-300" href={`/admin/assets/${asset.id}`} key={asset.id} prefetch={false}>{asset.fileName}</Link>,
            asset.category,
            asset.access,
            asset.status,
            asset.sourceDeclarationEnabled ? "Enabled" : "Off",
          ])}
        />
        {canWriteAssets ? <AssetUploadForm associations={associations} /> : <p className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-300">You have review-only Asset access. Open an Asset to review an enabled declaration.</p>}
      </div>
    </main>
  );
}
