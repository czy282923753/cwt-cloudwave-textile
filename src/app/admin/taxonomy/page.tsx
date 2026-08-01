import { createTaxonomyAction } from "@/admin/actions";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminTaxonomy } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminTaxonomyPage() {
  await requireCurrentUser("products.read");
  const terms = await listAdminTaxonomy();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        description="Four product dimensions only; end use belongs in Applications. Sports Fabric is a Commercial Collection, while Sportswear is an Application."
        title="Product Taxonomy"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <AdminTable
          headers={["Name", "Dimension"]}
          rows={terms.map((term) => [term.name, term.dimension])}
        />
        <form action={createTaxonomyAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">New taxonomy term</h2>
          <input className="rounded-lg bg-slate-950 p-3" name="name" placeholder="English name" required />
          <input className="rounded-lg bg-slate-950 p-3" name="internalKey" placeholder="stable-internal-key" required />
          <select className="rounded-lg bg-slate-950 p-3" name="dimension" required>
            <option value="material_fiber">Material / Fiber</option>
            <option value="structure_construction">Structure / Construction</option>
            <option value="commercial_collection">Commercial Collection</option>
            <option value="surface_hand_feel">Surface / Hand Feel</option>
          </select>
          <textarea className="rounded-lg bg-slate-950 p-3" name="description" placeholder="Optional description" rows={4} />
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create noindex term</button>
        </form>
      </div>
    </main>
  );
}
