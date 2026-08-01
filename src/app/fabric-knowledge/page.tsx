import type { Metadata } from "next";
import { ContentIndexPage } from "@/public-site/content-pages";
export const revalidate = 3600;
export const metadata: Metadata = { title: "Fabric Knowledge", description: "Fabric properties, comparisons, measurements, structures, applications, and sourcing fundamentals.", alternates: { canonical: "/fabric-knowledge/" } };
export default function Page() { return <ContentIndexPage channel="fabric_knowledge" />; }
