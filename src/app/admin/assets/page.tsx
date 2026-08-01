import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import { listAdminAssets } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminAssetsPage() {
  await requireCurrentUser("assets.read");
  const assets = await listAdminAssets();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="Ordinary uploads keep Source Declaration OFF. Inquiry files use a separate private flow and never appear here."
        title="Asset Library"
      />
      <div className="grid gap-8 xl:grid-cols-[1fr_32rem]">
        <AdminTable
          headers={["File", "Category", "Access", "Status", "Declaration"]}
          rows={assets.map((asset) => [
            asset.fileName,
            asset.category,
            asset.access,
            asset.status,
            asset.sourceDeclarationEnabled ? "Enabled" : "Off",
          ])}
        />
        <AssetUploadForm />
      </div>
    </main>
  );
}
