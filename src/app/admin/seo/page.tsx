import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminSeoRoutes } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminSeoPage() {
  await requireCurrentUser("seo.manage");
  const routes = await listAdminSeoRoutes();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="A route owns one canonical path and an independent Index/Noindex decision. Keyword ownership is unique per normalized intent phrase."
        title="SEO Routes"
      />
      <AdminTable
        headers={["Path", "Entity", "Index", "Canonical", "Title"]}
        rows={routes.map((route) => [route.path, route.entityType, route.indexStatus ?? "noindex", route.canonicalPath ?? "—", route.title ?? "—"])}
      />
    </main>
  );
}
