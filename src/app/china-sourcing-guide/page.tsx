import type { Metadata } from "next";
import { ContentIndexPage } from "@/public-site/content-pages";
export const revalidate = 3600;
export const metadata: Metadata = { title: "China Sourcing Guide", description: "Fabric supplier selection, sampling, MOQ conversations, development, sourcing workflows, and export considerations.", alternates: { canonical: "/china-sourcing-guide" } };
export default function Page() { return <ContentIndexPage channel="china_sourcing_guide" />; }
