"use client";

import { useEffect } from "react";

import { trackPublicEvent } from "./tracking";

export function ProductViewTracker({
  path,
}: Readonly<{ path: string }>) {
  useEffect(() => {
    trackPublicEvent("product_view", path, {}, { entityType: "product", entityPath: path });
  }, [path]);
  return null;
}
