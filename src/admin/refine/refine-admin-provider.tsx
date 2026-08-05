"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";

const resources = [
  { name: "products", list: "/admin/products" },
  { name: "taxonomy", list: "/admin/taxonomy" },
  { name: "applications", list: "/admin/applications" },
  { name: "assets", list: "/admin/assets" },
  { name: "fabric-library", list: "/admin/fabric-library" },
  { name: "contents", list: "/admin/contents" },
  { name: "home-page", list: "/admin/site/home" },
  { name: "about-cwt", list: "/admin/site/about" },
  { name: "authors", list: "/admin/authors" },
  { name: "company-facts", list: "/admin/company-facts" },
  { name: "seo", list: "/admin/seo" },
  { name: "inquiries", list: "/admin/inquiries" },
  { name: "contacts", list: "/admin/contacts" },
] as const;

export function RefineAdminProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Refine
      routerProvider={routerProvider}
      resources={resources.map((resource) => ({ ...resource }))}
      options={{
        disableTelemetry: true,
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
      }}
    >
      {children}
    </Refine>
  );
}
