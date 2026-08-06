import { describe, expect, it } from "vitest";

import type { BlockDocument } from "./blocks";
import {
  applyBlockCommand,
  BLOCK_HISTORY_LIMIT,
  blockHistoryReducer,
  createBlockHistoryState,
} from "./block-editor-state";

const initial: BlockDocument = {
  version: 1,
  blocks: [
    { id: "one", type: "paragraph", text: "One" },
    { id: "two", type: "heading", level: 2, text: "Two" },
  ],
};

describe("U-11 shared Block Editor command history", () => {
  it("inserts, edits, copies with a new ID, moves, deletes, and preserves deterministic order", () => {
    let document = applyBlockCommand(initial, {
      type: "insert",
      index: 1,
      block: { id: "inserted", type: "callout", text: "Inserted" },
    });
    document = applyBlockCommand(document, {
      type: "update",
      blockId: "inserted",
      block: { id: "inserted", type: "callout", title: "Note", text: "Changed" },
    });
    document = applyBlockCommand(document, {
      type: "duplicate",
      blockId: "inserted",
      newBlockId: "copy",
    });
    document = applyBlockCommand(document, {
      type: "move",
      blockId: "copy",
      toIndex: 0,
    });
    document = applyBlockCommand(document, { type: "remove", blockId: "one" });
    expect(document.blocks.map((block) => block.id)).toEqual([
      "copy",
      "inserted",
      "two",
    ]);
    expect(document.blocks[0]).toMatchObject({
      id: "copy",
      type: "callout",
      text: "Changed",
      locked: false,
    });
  });

  it("enforces Lock for every mutation except explicit unlock", () => {
    const locked = applyBlockCommand(initial, { type: "toggle_lock", blockId: "one" });
    expect(locked.blocks[0]?.locked).toBe(true);
    expect(() => applyBlockCommand(locked, {
      type: "update",
      blockId: "one",
      block: { id: "one", type: "paragraph", text: "Changed" },
    })).toThrow(/Unlock/);
    expect(() => applyBlockCommand(locked, { type: "remove", blockId: "one" }))
      .toThrow(/Unlock/);
    expect(() => applyBlockCommand(locked, { type: "move", blockId: "one", toIndex: 1 }))
      .toThrow(/Unlock/);
    expect(() => applyBlockCommand(locked, {
      type: "duplicate",
      blockId: "one",
      newBlockId: "copy",
    })).toThrow(/Unlock/);
    const unlocked = applyBlockCommand(locked, { type: "toggle_lock", blockId: "one" });
    expect(applyBlockCommand(unlocked, { type: "remove", blockId: "one" }).blocks)
      .toHaveLength(1);
  });

  it("keeps Locked Blocks as sorting anchors while allowing movement inside each interval", () => {
    const anchored: BlockDocument = {
      version: 1,
      blocks: [
        { id: "left-one", type: "paragraph", text: "Left one" },
        { id: "left-two", type: "paragraph", text: "Left two" },
        { id: "anchor", type: "heading", level: 2, text: "Anchor", locked: true },
        { id: "right-one", type: "paragraph", text: "Right one" },
        { id: "right-two", type: "paragraph", text: "Right two" },
      ],
    };
    expect(applyBlockCommand(anchored, { type: "move", blockId: "left-two", toIndex: 0 }).blocks.map((block) => block.id))
      .toEqual(["left-two", "left-one", "anchor", "right-one", "right-two"]);
    expect(applyBlockCommand(anchored, { type: "move", blockId: "right-two", toIndex: 3 }).blocks.map((block) => block.id))
      .toEqual(["left-one", "left-two", "anchor", "right-two", "right-one"]);
    expect(() => applyBlockCommand(anchored, { type: "move", blockId: "left-two", toIndex: 3 }))
      .toThrow(/sorting anchors/);
    expect(() => applyBlockCommand(anchored, { type: "move", blockId: "right-one", toIndex: 1 }))
      .toThrow(/sorting anchors/);
  });

  it("protects Locked anchors at either edge and allows crossing after explicit Unlock", () => {
    const firstLocked: BlockDocument = {
      version: 1,
      blocks: [
        { id: "first-anchor", type: "divider", locked: true },
        { id: "second", type: "paragraph", text: "Second" },
      ],
    };
    const lastLocked: BlockDocument = {
      version: 1,
      blocks: [
        { id: "first", type: "paragraph", text: "First" },
        { id: "last-anchor", type: "divider", locked: true },
      ],
    };
    expect(() => applyBlockCommand(firstLocked, { type: "move", blockId: "second", toIndex: 0 }))
      .toThrow(/sorting anchors/);
    expect(() => applyBlockCommand(lastLocked, { type: "move", blockId: "first", toIndex: 1 }))
      .toThrow(/sorting anchors/);
    const unlocked = applyBlockCommand(firstLocked, { type: "toggle_lock", blockId: "first-anchor" });
    expect(applyBlockCommand(unlocked, { type: "move", blockId: "second", toIndex: 0 }).blocks[0]?.id)
      .toBe("second");
  });

  it("supports bounded Undo/Redo and clears Redo after a new command", () => {
    let state = createBlockHistoryState(initial);
    state = blockHistoryReducer(state, {
      type: "command",
      command: { type: "move", blockId: "two", toIndex: 0 },
    });
    expect(state.present.blocks[0]?.id).toBe("two");
    state = blockHistoryReducer(state, { type: "undo" });
    expect(state.present.blocks[0]?.id).toBe("one");
    state = blockHistoryReducer(state, { type: "redo" });
    expect(state.present.blocks[0]?.id).toBe("two");
    state = blockHistoryReducer(state, { type: "undo" });
    state = blockHistoryReducer(state, {
      type: "command",
      command: { type: "toggle_lock", blockId: "one" },
    });
    expect(state.present.blocks[0]?.locked).toBe(true);
    state = blockHistoryReducer(state, { type: "undo" });
    expect(state.present.blocks[0]?.locked).not.toBe(true);
    state = blockHistoryReducer(state, { type: "redo" });
    expect(state.present.blocks[0]?.locked).toBe(true);
    expect(state.future).toEqual([]);

    for (let index = 0; index < BLOCK_HISTORY_LIMIT + 5; index += 1) {
      state = blockHistoryReducer(state, {
        type: "command",
        command: { type: "toggle_lock", blockId: "one" },
      });
    }
    expect(state.past).toHaveLength(BLOCK_HISTORY_LIMIT);
  });

  it("rejects duplicate IDs and identity changes", () => {
    expect(() => applyBlockCommand(initial, {
      type: "insert",
      block: { id: "one", type: "divider" },
    })).toThrow(/unique/);
    expect(() => applyBlockCommand(initial, {
      type: "update",
      blockId: "one",
      block: { id: "different", type: "paragraph", text: "Changed" },
    })).toThrow(/identity/);
  });
});
