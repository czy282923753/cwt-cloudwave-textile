import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPromptBundleLoaderV1 } from "@/ai/prompts/loader";
import { renderPromptV1 } from "@/ai/prompts/renderer";

import { syntheticPromptBundleV1 } from "./synthetic-prompt-bundle.generated";

describe("isolated Synthetic Prompt authority", () => {
  it("loads exact immutable bytes and renders only declared variables", () => {
    const loader = createPromptBundleLoaderV1(syntheticPromptBundleV1);
    expect(loader.ok).toBe(true);
    if (!loader.ok) return;
    const resource = loader.value.load({
      promptId: "synthetic-extensibility-probe",
      promptVersion: 1,
      promptHash: "53cfdaaa0952cd52015a553b43952a43a15e0f28a9f0a36a50583eee2a0badb7",
      applicationClass: "synthetic_test_application",
      capability: "text",
      useCase: "synthetic_extensibility_probe",
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "synthetic-probe-policy-v1",
    });
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    const rendered = renderPromptV1({
      resource: resource.value,
      variables: {
        marker: "SYNTHETIC TEST DATA — NOT A CWT FACT",
        observation: "SYNTHETIC TEST DATA — NOT A CWT FACT: bounded fixture observation.",
      },
    });
    expect(rendered).toMatchObject({
      ok: true,
      value: {
        input: "",
      },
    });
    if (rendered.ok) {
      expect(rendered.value.instructions).toContain("synthetic_review_packet");
      expect(rendered.value.instructions).not.toContain("{{");
    }
  });

  it("fails closed on tuple or variable drift", () => {
    const loader = createPromptBundleLoaderV1(syntheticPromptBundleV1);
    expect(loader.ok).toBe(true);
    if (!loader.ok) return;
    expect(loader.value.load({
      promptId: "synthetic-extensibility-probe",
      promptVersion: 1,
      promptHash: "53cfdaaa0952cd52015a553b43952a43a15e0f28a9f0a36a50583eee2a0badb7",
      applicationClass: "synthetic_test_application",
      capability: "text",
      useCase: "synthetic_extensibility_probe",
      inputSchemaVersion: 1,
      outputSchemaVersion: 1,
      policyVersion: "changed-policy",
    })).toMatchObject({ ok: false, error: { code: "prompt_contract_mismatch" } });
  });
});
