import { createContentAction } from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import Link from "next/link";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminAuthors, listAdminContents } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminContentsPage() {
  await requireCurrentUser("content.read");
  const [contents, authors] = await Promise.all([
    listAdminContents(),
    listAdminAuthors(),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="Three independent SEO channels share one governed editorial and revision workflow."
        title="Content"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_28rem]">
        <AdminTable
          headers={["Title", "Channel", "Status", "Updated"]}
          rows={contents.map((content) => [
            <Link className="text-teal-300" href={`/admin/contents/${content.id}`} key={content.id}>{content.title}</Link>,
            content.channel,
            content.status,
            content.updatedAt.toLocaleString("en-GB"),
          ])}
        />
        <AdminActionForm action={createContentAction} className="grid content-start gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5" successMessage="Content Draft created.">
          <h2 className="text-xl font-semibold">New Content Draft</h2>
          <select className="rounded-lg bg-slate-950 p-3" name="channel" required>
            <option value="fabric_knowledge">Fabric Knowledge</option>
            <option value="china_textile_guide">China Textile Guide</option>
            <option value="china_sourcing_guide">China Sourcing Guide</option>
          </select>
          <select className="rounded-lg bg-slate-950 p-3" name="type" required>
            <option value="article">Article</option><option value="pillar">Pillar</option><option value="comparison">Comparison</option><option value="how_to">How-to</option><option value="guide">Guide</option>
          </select>
          <select className="rounded-lg bg-slate-950 p-3" name="authorId" required>
            {authors.filter((author) => author.isActive).map((author) => <option key={author.id} value={author.id}>{author.displayName}</option>)}
          </select>
          <input className="rounded-lg bg-slate-950 p-3" name="title" placeholder="Title" required />
          <textarea className="rounded-lg bg-slate-950 p-3" name="excerpt" placeholder="Optional excerpt" rows={3} />
          <textarea className="rounded-lg bg-slate-950 p-3" name="body" placeholder="Article body" required rows={10} />
          <button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950" type="submit">Create Draft</button>
        </AdminActionForm>
      </div>
    </main>
  );
}
