// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/admin/actions", () => ({
  saveBlockDocument: vi.fn(async () => ({
    success: true,
    editorDocumentVersion: 1,
    revisionId: null,
    revisionVersion: null,
  })),
}));

import { BlockEditor } from "./block-editor";

describe("BlockEditor locked Block controls", () => {
  afterEach(cleanup);

  it("allows only explicit Unlock before editing, copying, deleting, or dragging", async () => {
    const user = userEvent.setup();
    render(<BlockEditor
      contentOptions={[]}
      editorDocumentVersion={1}
      entityId="00000000-0000-4000-8000-000000000001"
      entityType="product"
      initialDocument={{
        version: 1,
        blocks: [{ id: "locked-paragraph", type: "paragraph", text: "Locked", locked: true }],
      }}
      initialSummary={null}
      initialTitle="TEST Product"
      internalLinkOptions={[]}
      mediaOptions={[]}
      previewHref="/admin/preview/product/00000000-0000-4000-8000-000000000001/"
      productOptions={[]}
    />);

    const paragraph = screen.getByRole("textbox", { name: "Paragraph" });
    const article = paragraph.closest("article");
    expect(paragraph).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(article).toHaveAttribute("draggable", "false");

    await user.click(screen.getByRole("button", { name: "Unlock" }));
    expect(paragraph).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(article).toHaveAttribute("draggable", "true");
  });

  it("disables keyboard moves that would cross a Locked sorting anchor", () => {
    render(<BlockEditor
      contentOptions={[]}
      editorDocumentVersion={1}
      entityId="00000000-0000-4000-8000-000000000001"
      entityType="content"
      initialDocument={{
        version: 1,
        blocks: [
          { id: "left", type: "paragraph", text: "Left" },
          { id: "anchor", type: "divider", locked: true },
          { id: "right", type: "paragraph", text: "Right" },
        ],
      }}
      initialSummary={null}
      initialTitle="TEST Content"
      internalLinkOptions={[]}
      mediaOptions={[]}
      previewHref="/admin/preview/content/00000000-0000-4000-8000-000000000001/"
      productOptions={[]}
    />);

    const moveDown = screen.getAllByRole("button", { name: "Move down" });
    const moveUp = screen.getAllByRole("button", { name: "Move up" });
    expect(moveDown[0]).toBeDisabled();
    expect(moveUp[2]).toBeDisabled();
  });

  it("rejects pointer drag targets across a Locked sorting anchor", () => {
    render(<BlockEditor
      contentOptions={[]}
      editorDocumentVersion={1}
      entityId="00000000-0000-4000-8000-000000000001"
      entityType="product"
      initialDocument={{
        version: 1,
        blocks: [
          { id: "left", type: "paragraph", text: "Left" },
          { id: "anchor", type: "divider", locked: true },
          { id: "right", type: "paragraph", text: "Right" },
        ],
      }}
      initialSummary={null}
      initialTitle="TEST Product"
      internalLinkOptions={[]}
      mediaOptions={[]}
      previewHref="/admin/preview/product/00000000-0000-4000-8000-000000000001/"
      productOptions={[]}
    />);

    const articles = screen.getAllByRole("article");
    fireEvent.dragStart(articles[0]!);
    fireEvent.dragOver(articles[2]!);
    fireEvent.drop(articles[2]!);
    expect(screen.getByText(/Locked Blocks are sorting anchors/)).toBeVisible();
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("left");
    expect(screen.getAllByRole("article")[1]).toHaveTextContent("anchor");
  });
});
