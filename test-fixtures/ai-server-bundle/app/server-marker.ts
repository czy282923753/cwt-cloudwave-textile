import "server-only";

import { CWT_PRODUCTION_PROMPT_BUNDLE_MARKER } from "../../../src/ai/prompts/generated/production-prompt-bundle.generated";
import { CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A } from "../../../src/ai/server-bundle-marker";
import {
  CWT_SYNTHETIC_PROMPT_BUNDLE_MARKER,
  syntheticPromptBundleV1,
} from "../../../src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated";

const [syntheticPrompt] = syntheticPromptBundleV1;
if (syntheticPrompt === undefined) throw new Error("Synthetic Prompt fixture is empty.");

export const serverFixtureMarkers = [
  CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A,
  CWT_PRODUCTION_PROMPT_BUNDLE_MARKER,
  CWT_SYNTHETIC_PROMPT_BUNDLE_MARKER,
].join("|");

export const serverFixtureRawPrompt = Buffer.from(
  syntheticPrompt.rawBase64,
  "base64",
).toString("utf8");
