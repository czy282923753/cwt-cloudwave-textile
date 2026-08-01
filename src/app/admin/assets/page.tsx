import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { AssetUploadForm } from "@/admin/components/asset-upload-form";
import {
  listAdminAssets,
  listAdminContents,
  listAdminFabricEntries,
  listAdminProducts,
} from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import Link from "next/link";

export default async function AdminAssetsPage() {
  await requireCurrentUser("assets.read");
  const [assets, products, contents, fabricEntries] = await Promise.all([
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
      <div className="grid gap-8 xl:grid-cols-[1fr_32rem]">
        <AdminTable
          headers={["File", "Category", "Access", "Status", "Declaration"]}
          rows={assets.map((asset) => [
            <Link className="text-teal-300" href={`/admin/assets/${asset.id}`} key={asset.id}>{asset.fileName}</Link>,
            asset.category,
            asset.access,
            asset.status,
            asset.sourceDeclarationEnabled ? "Enabled" : "Off",
          ])}
        />
        <AssetUploadForm associations={associations} />
      </div>
    </main>
  );
}
