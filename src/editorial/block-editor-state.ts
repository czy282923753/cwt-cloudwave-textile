import {
  blockDocumentSchema,
  type BlockDocument,
  type EditorialBlock,
} from "./blocks";

export const BLOCK_HISTORY_LIMIT = 50;

export type BlockEditorCommand =
  | { type: "insert"; block: EditorialBlock; index?: number }
  | { type: "update"; blockId: string; block: EditorialBlock }
  | { type: "remove"; blockId: string }
  | { type: "duplicate"; blockId: string; newBlockId: string }
  | { type: "move"; blockId: string; toIndex: number }
  | { type: "toggle_lock"; blockId: string };

export interface BlockHistoryState {
  past: BlockDocument[];
  present: BlockDocument;
  future: BlockDocument[];
}

export type BlockHistoryAction =
  | { type: "command"; command: BlockEditorCommand }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "accept_server"; document: BlockDocument };

export function createBlockHistoryState(document: BlockDocument): BlockHistoryState {
  return { past: [], present: blockDocumentSchema.parse(document), future: [] };
}

function normalizeIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length));
}

export function canMoveBlock(
  document: BlockDocument,
  blockId: string,
  toIndex: number,
): boolean {
  const fromIndex = document.blocks.findIndex((block) => block.id === blockId);
  if (fromIndex < 0 || document.blocks[fromIndex]?.locked) return false;
  const blocks = [...document.blocks];
  const [current] = blocks.splice(fromIndex, 1);
  if (!current) return false;
  const targetIndex = normalizeIndex(toIndex, blocks.length);
  if (targetIndex === fromIndex) return false;
  blocks.splice(targetIndex, 0, current);
  return document.blocks.every((block, index) => (
    !block.locked || blocks[index]?.id === block.id
  ));
}

export function applyBlockCommand(
  document: BlockDocument,
  command: BlockEditorCommand,
): BlockDocument {
  const blocks = [...document.blocks];
  if (command.type === "insert") {
    if (blocks.some((block) => block.id === command.block.id)) {
      throw new Error("Block IDs must be unique within a document.");
    }
    blocks.splice(normalizeIndex(command.index ?? blocks.length, blocks.length), 0, command.block);
  } else {
    const index = blocks.findIndex((block) => block.id === command.blockId);
    if (index < 0) throw new Error("Block was not found.");
    const current = blocks[index]!;
    if (command.type === "update") {
      if (current.locked) throw new Error("Unlock this Block before editing it.");
      if (command.block.id !== current.id) throw new Error("Block identity cannot change during edit.");
      blocks[index] = command.block;
    } else if (command.type === "remove") {
      if (current.locked) throw new Error("Unlock this Block before deleting it.");
      blocks.splice(index, 1);
    } else if (command.type === "duplicate") {
      if (current.locked) throw new Error("Unlock this Block before copying it.");
      if (blocks.some((block) => block.id === command.newBlockId)) {
        throw new Error("Block IDs must be unique within a document.");
      }
      blocks.splice(index + 1, 0, { ...current, id: command.newBlockId, locked: false });
    } else if (command.type === "move") {
      if (current.locked) throw new Error("Unlock this Block before moving it.");
      if (!canMoveBlock(document, command.blockId, command.toIndex)) {
        throw new Error("Locked Blocks are sorting anchors and cannot be crossed.");
      }
      blocks.splice(index, 1);
      blocks.splice(normalizeIndex(command.toIndex, blocks.length), 0, current);
    } else {
      blocks[index] = { ...current, locked: !current.locked };
    }
  }
  return { version: document.version, blocks };
}

export function blockHistoryReducer(
  state: BlockHistoryState,
  action: BlockHistoryAction,
): BlockHistoryState {
  if (action.type === "accept_server") {
    return createBlockHistoryState(action.document);
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future].slice(0, BLOCK_HISTORY_LIMIT),
    };
  }
  if (action.type === "redo") {
    const next = state.future[0];
    if (!next) return state;
    return {
      past: [...state.past, state.present].slice(-BLOCK_HISTORY_LIMIT),
      present: next,
      future: state.future.slice(1),
    };
  }
  const present = applyBlockCommand(state.present, action.command);
  return {
    past: [...state.past, state.present].slice(-BLOCK_HISTORY_LIMIT),
    present,
    future: [],
  };
}
