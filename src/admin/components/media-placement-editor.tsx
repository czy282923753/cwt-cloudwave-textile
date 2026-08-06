"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";

const inputClass = "min-w-0 w-full rounded-lg border border-white/10 bg-slate-950 p-3";
const buttonClass =
  "rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40";

interface AssetOption {
  id: string;
  label: string;
  selectable?: boolean;
}

interface MediaPlacement {
  assetId: string;
  role: string;
  sortOrder: number;
  altText: string | null;
  caption: string | null;
  isVisible: boolean;
  blockKey?: string | null;
}

interface MediaPlacementEditorProps {
  entityType: "product" | "content";
  assets: readonly AssetOption[];
  initial: readonly MediaPlacement[];
}

export function MediaPlacementEditor({
  entityType,
  assets,
  initial,
}: Readonly<MediaPlacementEditorProps>) {
  const [placements, setPlacements] = useState(() =>
    [...initial].sort((left, right) => left.sortOrder - right.sortOrder),
  );
  const [candidate, setCandidate] = useState(
    assets.find((asset) => asset.selectable !== false)?.id ?? "",
  );
  const draggedRef = useRef<string | null>(null);
  const labels = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset.label])),
    [assets],
  );
  const selected = new Set(placements.map((placement) => placement.assetId));
  const available = assets.filter((asset) =>
    asset.selectable !== false && !selected.has(asset.id),
  );
  const primaryRole = entityType === "product" ? "hero" : "cover";
  const primary =
    placements.find((placement) => placement.role === primaryRole)?.assetId ??
    (entityType === "product" ? placements[0]?.assetId ?? "" : "");

  function replace(assetId: string, patch: Partial<MediaPlacement>) {
    setPlacements((current) =>
      current.map((item) =>
        item.assetId === assetId ? { ...item, ...patch } : item,
      ),
    );
  }

  function move(assetId: string, toIndex: number) {
    setPlacements((current) => {
      const from = current.findIndex((item) => item.assetId === assetId);
      if (from < 0) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      if (!item) return current;
      next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
      return next;
    });
  }

  function add() {
    if (!candidate || selected.has(candidate)) return;
    setPlacements((current) => [
      ...current,
      {
        assetId: candidate,
        role: entityType === "product" ? "gallery" : "inline",
        sortOrder: current.length,
        altText: null,
        caption: null,
        isVisible: true,
        blockKey: null,
      },
    ]);
    setCandidate(available.find((asset) => asset.id !== candidate)?.id ?? "");
  }

  return (
    <fieldset className="grid min-w-0 gap-4 rounded-xl border border-white/10 p-3 sm:p-4">
      <legend>Governed media placements</legend>
      <p className="text-sm text-slate-400">
        Pointer drag and keyboard Move controls update the same deterministic order.
        Unlinking never deletes the shared Asset.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="grid min-w-0 basis-64 flex-1 gap-2">
          Asset Library
          <select
            className={inputClass}
            onChange={(event) => setCandidate(event.target.value)}
            value={candidate}
          >
            <option value="">Select eligible Asset…</option>
            {available.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={buttonClass}
          disabled={!candidate}
          onClick={add}
          type="button"
        >
          Add relation
        </button>
      </div>

      {placements.map((placement, index) => (
        <article
          className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-2"
          draggable
          key={placement.assetId}
          onDragEnd={() => {
            draggedRef.current = null;
          }}
          onDragOver={(event: DragEvent<HTMLElement>) => event.preventDefault()}
          onDragStart={() => {
            draggedRef.current = placement.assetId;
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedRef.current) move(draggedRef.current, index);
            draggedRef.current = null;
          }}
        >
          <input name="assetIds" type="hidden" value={placement.assetId} />
          <input
            name={`assetSort:${placement.assetId}`}
            type="hidden"
            value={index}
          />
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <strong className="min-w-0 break-all">
              {index + 1}. {labels.get(placement.assetId) ?? placement.assetId}
            </strong>
            <div className="flex flex-wrap gap-2">
              <button
                className={buttonClass}
                disabled={index === 0}
                onClick={() => move(placement.assetId, index - 1)}
                type="button"
              >
                Move up
              </button>
              <button
                className={buttonClass}
                disabled={index === placements.length - 1}
                onClick={() => move(placement.assetId, index + 1)}
                type="button"
              >
                Move down
              </button>
              <button
                className={buttonClass}
                onClick={() =>
                  setPlacements((current) =>
                    current.filter((item) => item.assetId !== placement.assetId),
                  )
                }
                type="button"
              >
                Unlink
              </button>
            </div>
          </div>
          <label className="grid gap-2">
            Role
            <select
              className={inputClass}
              name={`assetRole:${placement.assetId}`}
              onChange={(event) =>
                replace(placement.assetId, { role: event.target.value })
              }
              value={
                placement.role === "hero" || placement.role === "cover"
                  ? entityType === "product"
                    ? "gallery"
                    : "inline"
                  : placement.role
              }
            >
              {(entityType === "product"
                ? [
                    ["gallery", "Gallery"],
                    ["detail", "Detail"],
                    ["application", "Application"],
                  ]
                : [
                    ["inline", "Inline"],
                    ["gallery", "Gallery"],
                    ["detail", "Detail"],
                  ]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={placement.isVisible}
              name={`assetVisible:${placement.assetId}`}
              onChange={(event) =>
                replace(placement.assetId, { isVisible: event.target.checked })
              }
              type="checkbox"
              value="true"
            />
            Visible
          </label>
          {entityType === "content" ? (
            <label className="grid gap-2">
              Block Key
              <input
                className={inputClass}
                name={`assetBlockKey:${placement.assetId}`}
                onChange={(event) =>
                  replace(placement.assetId, {
                    blockKey: event.target.value || null,
                  })
                }
                pattern="[A-Za-z0-9_-]+"
                value={placement.blockKey ?? ""}
              />
            </label>
          ) : null}
          <label className="grid gap-2">
            Placement Alt Text
            <input
              className={inputClass}
              name={`assetAlt:${placement.assetId}`}
              onChange={(event) =>
                replace(placement.assetId, {
                  altText: event.target.value || null,
                })
              }
              value={placement.altText ?? ""}
            />
          </label>
          <label className="grid gap-2 sm:col-span-2">
            Caption
            <input
              className={inputClass}
              name={`assetCaption:${placement.assetId}`}
              onChange={(event) =>
                replace(placement.assetId, {
                  caption: event.target.value || null,
                })
              }
              value={placement.caption ?? ""}
            />
          </label>
        </article>
      ))}

      {placements.length ? (
        <label className="grid gap-2">
          {entityType === "product" ? "Primary / Hero Image" : "Cover Image"}
          <select
            className={inputClass}
            name={entityType === "product" ? "heroAssetId" : "coverAssetId"}
            onChange={(event) => {
              const role = entityType === "product" ? "hero" : "cover";
              setPlacements((current) =>
                current.map((item) => ({
                  ...item,
                  role:
                    item.assetId === event.target.value
                      ? role
                      : item.role === role
                        ? entityType === "product"
                          ? "gallery"
                          : "inline"
                        : item.role,
                })),
              );
            }}
            required={entityType === "product"}
            value={primary}
          >
            {entityType === "content" ? <option value="">No cover</option> : null}
            {placements.map((placement) => (
              <option key={placement.assetId} value={placement.assetId}>
                {labels.get(placement.assetId) ?? placement.assetId}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-amber-200">Add at least one eligible media relation.</p>
      )}
    </fieldset>
  );
}
