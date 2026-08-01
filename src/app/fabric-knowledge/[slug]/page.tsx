import type { Metadata } from "next";
import { ContentArticlePage, contentMetadata } from "@/public-site/content-pages";
export const revalidate = 3600;
export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> { return contentMetadata("fabric_knowledge", (await params).slug); }
export default async function Page({ params }: Readonly<{ params: Promise<{ slug: string }> }>) { return <ContentArticlePage channel="fabric_knowledge" slug={(await params).slug} />; }
