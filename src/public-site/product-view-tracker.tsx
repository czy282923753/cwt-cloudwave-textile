"use client";

import { useEffect } from "react";

import { trackPublicEvent } from "./tracking";

export function ProductViewTracker({
  productId,
  path,
}: Readonly<{ productId: string; path: string }>) {
  useEffect(() => {
    trackPublicEvent("product_view", path, { entity_type: "product", product_id: productId });
  }, [path, productId]);
  return null;
}
