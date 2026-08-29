import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Templates · CWT Operations",
  robots: { index: false, follow: false },
};

export default function EmailTemplateAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
