import type { Metadata } from "next";
import { ContentArticlePage, contentMetadata } from "@/public-site/content-pages";
export const revalidate = 3600;
export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> { return contentMetadata("china_textile_guide", (await params).slug); }
export default async function Page({ params }: Readonly<{ params: Promise<{ slug: string }> }>) { return <ContentArticlePage channel="china_textile_guide" slug={(await params).slug} />; }
