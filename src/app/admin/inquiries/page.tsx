import Link from "next/link";

import { AdminPageHeader, AdminTable } from "@/admin/components/admin-table";
import { listAdminInquiries } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";

export default async function AdminInquiriesPage() {
  const user = await requireCurrentUser("inquiries.read");
  const inquiries = await listAdminInquiries({ userId: user.id, role: user.role });
  return <main className="mx-auto max-w-7xl px-6 py-10"><AdminPageHeader description="Each Inquiry belongs to an exact-email Contact and has independent status history, assignment, priority, qualification, files, and activities." title="Inquiries" /><AdminTable headers={["Contact", "Status", "Priority", "Qualification", "Owner", "Source", "Created"]} rows={inquiries.map((inquiry) => [<Link className="text-teal-300" href={`/admin/inquiries/${inquiry.id}`} key={inquiry.id}>{inquiry.contactName}<span className="block text-xs text-slate-400">{inquiry.email}</span></Link>, inquiry.status, inquiry.priority, inquiry.qualificationStatus, inquiry.ownerName ?? "Unassigned", inquiry.sourcePagePath, inquiry.createdAt.toLocaleString("en-GB")])} /></main>;
}
