import { notFound } from "next/navigation";

import { AssetDeclarationForm } from "@/admin/components/asset-declaration-form";
import { AdminPageHeader } from "@/admin/components/admin-table";
import { getAdminAsset } from "@/admin/data";
import { requireCurrentUser } from "@/auth/current-user";
import { hasPermission } from "@/auth/permissions";

export default async function AssetDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireCurrentUser("assets.read");
  const asset = await getAdminAsset((await params).id);
  if (!asset) notFound();
  return <main className="mx-auto max-w-4xl px-6 py-10"><AdminPageHeader description={`${asset.category} · ${asset.access} · ${asset.status}`} title={asset.originalFileName} /><dl className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Detected MIME</dt><dd>{asset.detectedMimeType ?? "Pending"}</dd></div><div><dt className="text-slate-500">Scan</dt><dd>{asset.scanProvider ?? "Pending"} · {asset.scanStatus} · {asset.scanResult ?? "—"}</dd></div><div><dt className="text-slate-500">Storage partition</dt><dd>{asset.storagePartition}</dd></div><div><dt className="text-slate-500">Risk hints</dt><dd>{Array.isArray(asset.nonBlockingRiskHints) && asset.nonBlockingRiskHints.length ? asset.nonBlockingRiskHints.join(", ") : "None"}</dd></div></dl><AssetDeclarationForm asset={asset} canReviewDeclaration={hasPermission(user.role, "assets.declaration.review")} canWriteDeclaration={hasPermission(user.role, "assets.write")} /></main>;
}
