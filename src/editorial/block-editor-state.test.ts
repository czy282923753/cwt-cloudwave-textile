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

  it("enforces Lock for edit/delete, allows explicit unlock, and keeps moves available", () => {
    const locked = applyBlockCommand(initial, { type: "toggle_lock", blockId: "one" });
    expect(locked.blocks[0]?.locked).toBe(true);
    expect(() => applyBlockCommand(locked, {
      type: "update",
      blockId: "one",
      block: { id: "one", type: "paragraph", text: "Changed" },
    })).toThrow(/Unlock/);
    expect(() => applyBlockCommand(locked, { type: "remove", blockId: "one" }))
      .toThrow(/Unlock/);
    expect(applyBlockCommand(locked, { type: "move", blockId: "one", toIndex: 1 }).blocks[1]?.id)
      .toBe("one");
    const unlocked = applyBlockCommand(locked, { type: "toggle_lock", blockId: "one" });
    expect(applyBlockCommand(unlocked, { type: "remove", blockId: "one" }).blocks)
      .toHaveLength(1);
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
