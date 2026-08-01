import type { Metadata } from "next";
import { ContentIndexPage } from "@/public-site/content-pages";
export const revalidate = 3600;
export const metadata: Metadata = { title: "China Textile Guide", description: "China textile industry, clusters, Guangzhou market context, and fabric supply-chain knowledge.", alternates: { canonical: "/china-textile-guide" } };
export default function Page() { return <ContentIndexPage channel="china_textile_guide" />; }
