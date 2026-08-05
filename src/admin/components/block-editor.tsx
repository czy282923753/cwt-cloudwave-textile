"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import {
  saveBlockDocument,
  type BlockSaveResult,
} from "@/admin/actions";
import {
  blockHistoryReducer,
  createBlockHistoryState,
  type BlockEditorCommand,
} from "@/editorial/block-editor-state";
import type { BlockDocument, EditorialBlock } from "@/editorial/blocks";
import { PreviewViewportPanel } from "@/admin/components/preview-viewport-panel";

const inputClass = "rounded-lg border border-white/10 bg-slate-950 p-3";
const secondaryButton = "rounded-lg border border-white/20 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40";

export interface BlockEditorOption {
  id: string;
  label: string;
  value: string;
  usages?: readonly ("image" | "gallery")[];
}

export interface BlockEditorProps {
  entityType: "product" | "content";
  entityId: string;
  initialTitle: string;
  initialSummary: string | null;
  initialDocument: BlockDocument;
  editorDocumentVersion: number;
  draftRevisionId?: string | null;
  draftRevisionVersion?: number | null;
  mediaOptions: readonly BlockEditorOption[];
  productOptions: readonly BlockEditorOption[];
  contentOptions: readonly BlockEditorOption[];
  internalLinkOptions: readonly BlockEditorOption[];
  previewHref: string;
}

type SaveState = "saved" | "unsaved" | "saving" | "failed" | "conflict";
type BlockType = EditorialBlock["type"];

const blockLabels: Readonly<Record<BlockType, string>> = {
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  gallery: "Gallery",
  specification_table: "Specification Table",
  comparison_table: "Comparison Table",
  feature_list: "Feature List",
  bullet_list: "Bullet List",
  callout: "Callout",
  quote: "Quote",
  faq: "FAQ",
  related_products: "Related Products",
  related_articles: "Related Articles",
  cta: "CTA",
  divider: "Divider",
};

function newBlockId(): string {
  return `block_${crypto.randomUUID().replaceAll("-", "")}`;
}

function initialBlock(
  type: BlockType,
  mediaOptions: readonly BlockEditorOption[],
  productOptions: readonly BlockEditorOption[],
  contentOptions: readonly BlockEditorOption[],
  internalLinkOptions: readonly BlockEditorOption[],
): EditorialBlock {
  const id = newBlockId();
  const imageOptions = mediaOptions.filter((option) => option.usages?.includes("image") ?? true);
  const galleryOptions = mediaOptions.filter((option) => option.usages?.includes("gallery") ?? true);
  switch (type) {
    case "heading": return { id, type, level: 2, text: "New heading" };
    case "paragraph": return { id, type, text: "New paragraph" };
    case "image": return { id, type, mediaKey: imageOptions[0]?.value ?? "select-media" };
    case "gallery": return { id, type, mediaKeys: galleryOptions.slice(0, 2).map((item) => item.value) };
    case "specification_table": return { id, type, rows: [{ label: "Label", value: "Value" }] };
    case "comparison_table": return { id, type, columns: ["Option A", "Option B"], rows: [{ label: "Item", cells: ["Value A", "Value B"] }] };
    case "feature_list": return { id, type, items: ["New feature"] };
    case "bullet_list": return { id, type, items: ["New item"] };
    case "callout": return { id, type, title: "Note", text: "New callout" };
    case "quote": return { id, type, text: "New quote" };
    case "faq": return { id, type, items: [{ question: "Question", answer: "Answer" }] };
    case "related_products": return { id, type, productIds: productOptions.slice(0, 1).map((item) => item.value) };
    case "related_articles": return { id, type, contentIds: contentOptions.slice(0, 1).map((item) => item.value) };
    case "cta": return { id, type, label: "Find Your Fabric Solution", href: internalLinkOptions[0]?.value ?? "/get-quote/" };
    case "divider": return { id, type };
  }
}

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return [...event.currentTarget.selectedOptions].map((option) => option.value);
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: Readonly<{
  label: string;
  options: readonly BlockEditorOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
}>) {
  return <label className="grid gap-2">{label}<select className={`${inputClass} min-h-32`} multiple onChange={(event) => onChange(selectedValues(event))} value={[...value]}>{options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select></label>;
}

function BlockFields({
  block,
  context,
  mediaOptions,
  productOptions,
  contentOptions,
  internalLinkOptions,
  onChange,
}: Readonly<{
  block: EditorialBlock;
  context: "product" | "content";
  mediaOptions: readonly BlockEditorOption[];
  productOptions: readonly BlockEditorOption[];
  contentOptions: readonly BlockEditorOption[];
  internalLinkOptions: readonly BlockEditorOption[];
  onChange: (block: EditorialBlock) => void;
}>) {
  if (block.type === "heading") return <div className="grid gap-3 sm:grid-cols-[8rem_1fr]"><label className="grid gap-2">Level<select className={inputClass} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 2 | 3 | 4 })} value={block.level}><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select></label><label className="grid gap-2">Text<input className={inputClass} onChange={(event) => onChange({ ...block, text: event.target.value })} value={block.text} /></label></div>;
  if (block.type === "paragraph") return <label className="grid gap-2">Paragraph<textarea className={inputClass} onChange={(event) => onChange({ ...block, text: event.target.value })} rows={6} value={block.text} /></label>;
  if (block.type === "image") return <label className="grid gap-2">Media relationship<select className={inputClass} onChange={(event) => onChange({ ...block, mediaKey: event.target.value })} value={block.mediaKey}>{mediaOptions.filter((option) => option.usages?.includes("image") ?? true).map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select></label>;
  if (block.type === "gallery") return <MultiSelect label="Gallery media relationships" onChange={(mediaKeys) => onChange({ ...block, mediaKeys })} options={mediaOptions.filter((option) => option.usages?.includes("gallery") ?? true)} value={block.mediaKeys} />;
  if (block.type === "specification_table") return <div className="grid gap-3"><p className="text-sm text-amber-200">{context === "product" ? "Product facts cannot be authored in narrative Blocks." : "One Label | Value row per line."}</p><label className="grid gap-2">Caption<input className={inputClass} onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })} value={block.caption ?? ""} /></label><label className="grid gap-2">Rows<textarea className={inputClass} onChange={(event) => onChange({ ...block, rows: event.target.value.split(/\r?\n/).filter(Boolean).map((line) => { const [label = "", ...rest] = line.split("|"); return { label: label.trim(), value: rest.join("|").trim() }; }) })} rows={6} value={block.rows.map((row) => `${row.label} | ${row.value}`).join("\n")} /></label></div>;
  if (block.type === "comparison_table") return <div className="grid gap-3"><label className="grid gap-2">Caption<input className={inputClass} onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })} value={block.caption ?? ""} /></label><label className="grid gap-2">Columns, separated by |<input className={inputClass} onChange={(event) => onChange({ ...block, columns: event.target.value.split("|").map((value) => value.trim()) })} value={block.columns.join(" | ")} /></label><label className="grid gap-2">Rows: Label | Cell 1 | Cell 2<textarea className={inputClass} onChange={(event) => onChange({ ...block, rows: event.target.value.split(/\r?\n/).filter(Boolean).map((line) => { const [label = "", ...cells] = line.split("|"); return { label: label.trim(), cells: cells.map((cell) => cell.trim()) }; }) })} rows={6} value={block.rows.map((row) => [row.label, ...row.cells].join(" | ")).join("\n")} /></label></div>;
  if (block.type === "feature_list" || block.type === "bullet_list") return <label className="grid gap-2">One item per line<textarea className={inputClass} onChange={(event) => onChange({ ...block, items: event.target.value.split(/\r?\n/) })} rows={6} value={block.items.join("\n")} /></label>;
  if (block.type === "callout") return <div className="grid gap-3"><label className="grid gap-2">Optional title<input className={inputClass} onChange={(event) => onChange({ ...block, title: event.target.value || undefined })} value={block.title ?? ""} /></label><label className="grid gap-2">Text<textarea className={inputClass} onChange={(event) => onChange({ ...block, text: event.target.value })} rows={5} value={block.text} /></label></div>;
  if (block.type === "quote") return <div className="grid gap-3"><label className="grid gap-2">Quote<textarea className={inputClass} onChange={(event) => onChange({ ...block, text: event.target.value })} rows={5} value={block.text} /></label><label className="grid gap-2">Optional attribution<input className={inputClass} onChange={(event) => onChange({ ...block, attribution: event.target.value || undefined })} value={block.attribution ?? ""} /></label></div>;
  if (block.type === "faq") return <label className="grid gap-2">One Question | Answer per line<textarea className={inputClass} onChange={(event) => onChange({ ...block, items: event.target.value.split(/\r?\n/).filter(Boolean).map((line) => { const [question = "", ...answer] = line.split("|"); return { question: question.trim(), answer: answer.join("|").trim() }; }) })} rows={8} value={block.items.map((item) => `${item.question} | ${item.answer}`).join("\n")} /></label>;
  if (block.type === "related_products") return <MultiSelect label="Eligible related Products" onChange={(productIds) => onChange({ ...block, productIds })} options={productOptions} value={block.productIds} />;
  if (block.type === "related_articles") return <MultiSelect label="Eligible related Articles" onChange={(contentIds) => onChange({ ...block, contentIds })} options={contentOptions} value={block.contentIds} />;
  if (block.type === "cta") return <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2">Label<input className={inputClass} onChange={(event) => onChange({ ...block, label: event.target.value })} value={block.label} /></label><label className="grid gap-2">Governed internal route<select className={inputClass} onChange={(event) => onChange({ ...block, href: event.target.value })} value={block.href}>{internalLinkOptions.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select></label><label className="grid gap-2 sm:col-span-2">Optional supporting text<textarea className={inputClass} onChange={(event) => onChange({ ...block, supportingText: event.target.value || undefined })} rows={3} value={block.supportingText ?? ""} /></label></div>;
  return <p className="text-sm text-slate-400">Divider has no editable content.</p>;
}

export function BlockEditor(props: Readonly<BlockEditorProps>) {
  const router = useRouter();
  const [history, dispatch] = useReducer(blockHistoryReducer, props.initialDocument, createBlockHistoryState);
  const [title, setTitle] = useState(props.initialTitle);
  const [summary, setSummary] = useState(props.initialSummary ?? "");
  const [insertType, setInsertType] = useState<BlockType>("paragraph");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [feedback, setFeedback] = useState<string | null>(null);
  const editorVersionRef = useRef(props.editorDocumentVersion);
  const revisionIdRef = useRef(props.draftRevisionId ?? null);
  const revisionVersionRef = useRef(props.draftRevisionVersion ?? null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const baselineRef = useRef(JSON.stringify({ title, summary, document: history.present }));
  const draggedIdRef = useRef<string | null>(null);
  const allowedTypes = useMemo(() => (Object.keys(blockLabels) as BlockType[]).filter((type) => (
    props.entityType === "content" || type !== "specification_table"
  )), [props.entityType]);
  const serialized = JSON.stringify({ title, summary, document: history.present });
  const currentDraftRef = useRef({ serialized, title, summary, document: history.present });
  const saveNowRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    currentDraftRef.current = {
      serialized,
      title,
      summary,
      document: history.present,
    };
  }, [history.present, serialized, summary, title]);

  const saveNow = useCallback(async () => {
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    const currentDraft = currentDraftRef.current;
    if (currentDraft.serialized === baselineRef.current) {
      setSaveState("saved");
      return;
    }
    savingRef.current = true;
    setSaveState("saving");
    setFeedback(null);
    let result: BlockSaveResult;
    try {
      result = await saveBlockDocument({
        entityType: props.entityType,
        entityId: props.entityId,
        title: currentDraft.title,
        summary: currentDraft.summary.trim() || null,
        document: currentDraft.document,
        expectedEditorDocumentVersion: editorVersionRef.current,
        revisionId: revisionIdRef.current,
        expectedRevisionVersion: revisionVersionRef.current,
      });
    } catch {
      result = {
        success: false,
        message: "The server could not be reached.",
        formError: "Your changes remain in this editor. Try Save now again.",
        fieldErrors: {},
        errorCode: "NETWORK_ERROR",
      };
    }
    if (result.success) {
      const createdFirstRevision = revisionIdRef.current === null && result.revisionId !== null;
      editorVersionRef.current = result.editorDocumentVersion;
      revisionIdRef.current = result.revisionId;
      revisionVersionRef.current = result.revisionVersion;
      baselineRef.current = currentDraft.serialized;
      setSaveState("saved");
      setFeedback("Draft saved. Review, Apply, Publish, and Index remain explicit actions.");
      if (createdFirstRevision) setTimeout(() => router.refresh(), 0);
    } else {
      setSaveState(result.errorCode === "CONFLICT" ? "conflict" : "failed");
      const blockDetails = Object.entries(result.fieldErrors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`));
      setFeedback([result.formError, ...blockDetails].join(" "));
    }
    savingRef.current = false;
    if (queuedRef.current) {
      queuedRef.current = false;
      setTimeout(() => void saveNowRef.current(), 0);
    }
  }, [props.entityId, props.entityType, router]);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  useEffect(() => {
    if (serialized === baselineRef.current) return;
    setSaveState((state) => state === "conflict" ? state : "unsaved");
    const timeout = window.setTimeout(() => void saveNow(), 1_200);
    return () => window.clearTimeout(timeout);
  }, [saveNow, serialized]);

  function command(next: BlockEditorCommand) {
    dispatch({ type: "command", command: next });
  }

  function move(blockId: string, toIndex: number) {
    command({ type: "move", blockId, toIndex });
  }

  const canInsert =
    (insertType !== "image" || props.mediaOptions.some((option) => option.usages?.includes("image") ?? true)) &&
    (insertType !== "gallery" || props.mediaOptions.some((option) => option.usages?.includes("gallery") ?? true)) &&
    (insertType !== "related_products" || props.productOptions.length > 0) &&
    (insertType !== "related_articles" || props.contentOptions.length > 0);

  return (
    <section className="grid gap-5 rounded-2xl border border-white/10 bg-slate-900 p-6" data-block-editor={props.entityType}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-semibold">Structured Block Editor</h2><p className="mt-2 text-sm text-slate-300">One shared V1 document, controlled components, local Undo/Redo, and version-checked Draft autosave.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span aria-live="polite" className={`rounded-full px-3 py-1 text-sm ${saveState === "conflict" || saveState === "failed" ? "bg-red-950 text-red-100" : saveState === "saved" ? "bg-teal-950 text-teal-100" : "bg-amber-950 text-amber-100"}`} role="status">{{ saved: "Saved", unsaved: "Unsaved changes", saving: "Saving…", failed: "Save failed", conflict: "Conflict" }[saveState]}</span><Link className={secondaryButton} href={props.previewHref} target="_blank">Preview Draft</Link></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">{props.entityType === "product" ? "Product Name" : "Content Title"}<input className={inputClass} onChange={(event) => setTitle(event.target.value)} value={title} /></label><label className="grid gap-2">{props.entityType === "product" ? "Short Description" : "Excerpt"}<textarea className={inputClass} onChange={(event) => setSummary(event.target.value)} rows={3} value={summary} /></label></div>
      <div className="flex flex-wrap gap-2"><button className={secondaryButton} disabled={!history.past.length} onClick={() => dispatch({ type: "undo" })} type="button">Undo</button><button className={secondaryButton} disabled={!history.future.length} onClick={() => dispatch({ type: "redo" })} type="button">Redo</button><button className={secondaryButton} disabled={saveState === "saving"} onClick={() => void saveNow()} type="button">Save now</button>{saveState === "conflict" ? <button className={secondaryButton} onClick={() => window.location.reload()} type="button">Reload latest server Draft</button> : null}</div>
      {feedback ? <p aria-live={saveState === "failed" || saveState === "conflict" ? "assertive" : "polite"} className="rounded-lg border border-white/10 p-3 text-sm" role={saveState === "failed" || saveState === "conflict" ? "alert" : "status"}>{feedback}</p> : null}
      <div className="grid gap-4">
        {history.present.blocks.map((block, index) => (
          <article className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4" draggable onDragEnd={() => { draggedIdRef.current = null; }} onDragOver={(event: DragEvent<HTMLElement>) => event.preventDefault()} onDragStart={() => { draggedIdRef.current = block.id; }} onDrop={(event) => { event.preventDefault(); const draggedId = draggedIdRef.current; if (draggedId && draggedId !== block.id) move(draggedId, index); draggedIdRef.current = null; }} key={block.id}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{index + 1}. {blockLabels[block.type]}</strong><span className="ml-3 text-xs text-slate-500">{block.id}</span></div><div className="flex flex-wrap gap-2"><button className={secondaryButton} disabled={index === 0} onClick={() => move(block.id, index - 1)} type="button">Move up</button><button className={secondaryButton} disabled={index === history.present.blocks.length - 1} onClick={() => move(block.id, index + 1)} type="button">Move down</button><button className={secondaryButton} onClick={() => command({ type: "duplicate", blockId: block.id, newBlockId: newBlockId() })} type="button">Copy</button><button aria-pressed={Boolean(block.locked)} className={secondaryButton} onClick={() => command({ type: "toggle_lock", blockId: block.id })} type="button">{block.locked ? "Unlock" : "Lock"}</button><button className={secondaryButton} disabled={block.locked} onClick={() => command({ type: "remove", blockId: block.id })} type="button">Delete</button></div></div>
            <fieldset className="contents" disabled={block.locked}><BlockFields block={block} contentOptions={props.contentOptions} context={props.entityType} internalLinkOptions={props.internalLinkOptions} mediaOptions={props.mediaOptions} onChange={(nextBlock) => command({ type: "update", blockId: block.id, block: nextBlock })} productOptions={props.productOptions} /></fieldset>
          </article>
        ))}
        {!history.present.blocks.length ? <p className="rounded-xl border border-dashed border-white/20 p-6 text-slate-400">No narrative Blocks. Empty content renders no public heading or placeholder.</p> : null}
      </div>
      <div className="flex flex-wrap items-end gap-3"><label className="grid gap-2">Insert Block<select className={inputClass} onChange={(event) => setInsertType(event.target.value as BlockType)} value={insertType}>{allowedTypes.map((type) => <option key={type} value={type}>{blockLabels[type]}</option>)}</select></label><button className="rounded-xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40" disabled={!canInsert} onClick={() => command({ type: "insert", block: initialBlock(insertType, props.mediaOptions, props.productOptions, props.contentOptions, props.internalLinkOptions) })} type="button">Insert Block</button>{!canInsert ? <p className="basis-full text-sm text-amber-200">Add an eligible relationship before inserting this Block type.</p> : null}</div>
      <PreviewViewportPanel href={props.previewHref} label={props.entityType === "product" ? "Product" : "Content"} />
    </section>
  );
}
