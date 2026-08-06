import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getContentPreviewModel } from "@/admin/preview-data";
import { resolveCurrentUser } from "@/auth/current-user";
import { ContentArticleRenderer } from "@/public-site/content-article-renderer";
import { PublicShell } from "@/public-site/shell";
import { canAccessEditorialResource } from "@/admin/preview-policy";

export const metadata: Metadata = { title: "Content Draft Preview", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";

export default async function ContentPreviewPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const currentUser = await resolveCurrentUser();
  if (!currentUser || !canAccessEditorialResource(currentUser.role, "content", "preview")) notFound();
  const { id } = await params;
  const preview = await getContentPreviewModel(id, currentUser.role);
  if (!preview) notFound();
  return <><div className="bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">Authenticated Content Draft/Revision Preview · noindex · not public eligibility</div><PublicShell><ContentArticleRenderer channelTitle={preview.channel} content={preview.content} /></PublicShell></>;
}
