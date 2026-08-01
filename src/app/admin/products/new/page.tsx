import { createProductAction } from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { listAdminAssets, listAdminTaxonomy } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function NewProductPage() {
  await requireCurrentUser("products.write");
  const [taxonomy, allAssets] = await Promise.all([
    listAdminTaxonomy(),
    listAdminAssets(),
  ]);
  const images = allAssets.filter(
    (asset) => asset.status === "ready" && asset.access === "public",
  );
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AdminPageHeader
        description="Draft creation requires only Product Name, Primary Category, and at least one ready public image. Unknown facts remain empty."
        title="New Product Draft"
      />
      <AdminActionForm action={createProductAction} className="grid gap-6 rounded-2xl border border-white/10 bg-slate-900 p-6" successMessage="Product Draft created.">
        <label className="grid gap-2">
          Product Name <input className="rounded-lg bg-slate-950 p-3" name="name" required />
        </label>
        <label className="grid gap-2">
          Primary Category
          <select className="rounded-lg bg-slate-950 p-3" name="primaryTaxonomyTermId" required>
            <option value="">Select…</option>
            {taxonomy.map((term) => (
              <option key={term.id} value={term.id}>{term.name} · {term.dimension}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-3">
          <legend>Product images (select at least one)</legend>
          {images.length ? images.map((asset) => (
            <label className="flex gap-3" key={asset.id}>
              <input name="assetIds" type="checkbox" value={asset.id} /> {asset.fileName}
            </label>
          )) : <p className="text-amber-300">Upload and scan a public Asset first.</p>}
        </fieldset>
        <button className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950" type="submit">
          Create Draft
        </button>
      </AdminActionForm>
    </main>
  );
}
