import type { Metadata } from "next";
import { env, publicIndexingAllowed } from "@/config/env";
import { AnalyticsConsent } from "@/public-site/analytics-consent";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "CloudWave Textile | Professional Fabric Supplier in China",
    template: "%s | CloudWave Textile",
  },
  description:
    "CloudWave Textile helps global brands source suitable fabric materials from China.",
  robots:
    publicIndexingAllowed()
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true, nosnippet: false },
  openGraph: {
    type: "website",
    siteName: "CloudWave Textile",
    title: "CloudWave Textile | Professional Fabric Supplier in China",
    description:
      "Multi-category fabric sourcing, matching, sampling, and export support from China.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
