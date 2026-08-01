"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";

const resources = [
  { name: "products", list: "/admin/products" },
  { name: "applications", list: "/admin/applications" },
  { name: "assets", list: "/admin/assets" },
  { name: "contents", list: "/admin/contents" },
  { name: "inquiries", list: "/admin/inquiries" },
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
