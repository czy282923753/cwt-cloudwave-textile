"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";

const resources = [
  { name: "products", list: "/admin/products", editorialResource: "product" },
  { name: "product-imports", list: "/admin/product-imports", importPermission: true },
  { name: "taxonomy", list: "/admin/taxonomy" },
  { name: "applications", list: "/admin/applications" },
  { name: "assets", list: "/admin/assets" },
  { name: "fabric-library", list: "/admin/fabric-library" },
  { name: "contents", list: "/admin/contents", editorialResource: "content" },
  { name: "home-page", list: "/admin/site/home", editorialResource: "static_page" },
  { name: "about-cwt", list: "/admin/site/about", editorialResource: "static_page" },
  { name: "authors", list: "/admin/authors" },
  { name: "company-facts", list: "/admin/company-facts" },
  { name: "seo", list: "/admin/seo" },
  { name: "inquiries", list: "/admin/inquiries" },
  { name: "contacts", list: "/admin/contacts" },
] as const;

export function RefineAdminProvider({
  children,
  editorialResources,
  canImportProducts,
}: Readonly<{
  children: React.ReactNode;
  editorialResources: readonly ("product" | "content" | "static_page")[];
  canImportProducts: boolean;
}>) {
  const allowed = new Set(editorialResources);
  return (
    <Refine
      routerProvider={routerProvider}
      resources={resources.filter((resource) => (
        (!("editorialResource" in resource) || allowed.has(resource.editorialResource)) &&
        (!("importPermission" in resource) || canImportProducts)
      )).map((resource) => ({ name: resource.name, list: resource.list }))}
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
