import type { Metadata } from "next";

import { publicIndexingAllowed } from "@/config/env";

export function derivedPageRobots(
  indexStatus: "index" | "noindex",
  hasEligibleProducts: boolean,
  indexingAllowed = publicIndexingAllowed(),
): NonNullable<Metadata["robots"]> {
  return {
    index: indexingAllowed && indexStatus === "index" && hasEligibleProducts,
    follow: indexingAllowed,
  };
}

export function staticPageRobots(
  hasRenderableContent: boolean,
  indexingAllowed = publicIndexingAllowed(),
): NonNullable<Metadata["robots"]> {
  return {
    index: indexingAllowed && hasRenderableContent,
    follow: indexingAllowed,
  };
}
