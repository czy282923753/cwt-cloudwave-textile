import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { publicIndexingAllowed } from "@/config/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
