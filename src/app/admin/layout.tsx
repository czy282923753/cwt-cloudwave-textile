import type { Metadata } from "next";
import { Suspense } from "react";

import { RefineAdminProvider } from "@/admin/refine/refine-admin-provider";

export const metadata: Metadata = {
  title: "CWT Operations",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<p className="p-6">Loading CWT Operations…</p>}>
      <RefineAdminProvider>{children}</RefineAdminProvider>
    </Suspense>
  );
}
