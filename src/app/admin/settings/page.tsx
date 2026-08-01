import { setFeatureFlagAction } from "@/admin/actions";
import { AdminActionForm } from "@/admin/components/admin-action-form";
import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminFeatureFlags } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminSettingsPage() {
  await requireCurrentUser("settings.manage");
  const flags = await listAdminFeatureFlags();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminPageHeader
        description="Governed runtime capability records. Production adapters and secrets remain environment-controlled and fail closed."
        title="Feature Flags"
      />
      <AdminTable
        headers={["Flag", "State", "Updated", "Action"]}
        rows={flags.map((flag) => [
          flag.key,
          flag.enabled ? "Enabled" : "Disabled",
          flag.updatedAt.toLocaleString("en-GB"),
          <AdminActionForm action={setFeatureFlagAction} key={flag.id} successMessage="Feature Flag updated.">
            <input name="flagId" type="hidden" value={flag.id} />
            <input name="enabled" type="hidden" value={flag.enabled ? "false" : "true"} />
            <button className="rounded-lg border border-white/20 px-3 py-2">
              {flag.enabled ? "Disable" : "Enable"}
            </button>
          </AdminActionForm>,
        ])}
      />
    </main>
  );
}
