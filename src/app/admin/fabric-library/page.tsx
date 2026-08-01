import { createFabricEntryAction } from "@/admin/actions";
import Link from "next/link";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminAssets, listAdminFabricEntries } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminFabricLibraryPage() {
  await requireCurrentUser("products.read");
  const [entries, assets] = await Promise.all([
    listAdminFabricEntries(),
    listAdminAssets(),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="Entries are visual discovery records, not Products or raw Assets. Thin entries stay Noindex."
        title="Fabric Library Entries"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
        <AdminTable
          headers={["Entry", "Status", "Updated"]}
          rows={entries.map((entry) => [<Link className="text-teal-300" href={`/admin/fabric-library/${entry.id}`} key={entry.id}>{entry.title}</Link>, entry.status, entry.updatedAt.toLocaleString("en-GB")])}
        />
        <form action={createFabricEntryAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">New visual entry</h2>
          <input className="rounded-lg bg-slate-950 p-3" name="title" placeholder="Title" required />
          <textarea className="rounded-lg bg-slate-950 p-3" name="description" placeholder="Optional independent description" rows={5} />
          <fieldset className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-white/10 p-3">
            <legend>Ready public images</legend>
            {assets.filter((asset) => asset.status === "ready" && asset.scanStatus === "passed" && asset.access === "public" && asset.deletedAt === null).map((asset) => (
              <label className="flex gap-2" key={asset.id}><input name="assetIds" type="checkbox" value={asset.id} />{asset.fileName}</label>
            ))}
          </fieldset>
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create Noindex Draft</button>
        </form>
      </div>
    </main>
  );
}
