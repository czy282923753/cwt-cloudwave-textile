import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminAuditLogs } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminAuditPage() {
  await requireCurrentUser("audit.read");
  const logs = await listAdminAuditLogs();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <AdminPageHeader
        description="Security and governed business mutations are recorded without passwords, raw sessions, or unnecessary customer content."
        title="Audit Log"
      />
      <AdminTable
        headers={["Time", "Action", "Entity", "Actor", "Request"]}
        rows={logs.map((log) => [
          log.createdAt.toLocaleString("en-GB"),
          log.action,
          `${log.entityType}${log.entityId ? ` · ${log.entityId}` : ""}`,
          log.actorUserId ?? "system / anonymous",
          log.requestId ?? "—",
        ])}
      />
    </main>
  );
}
