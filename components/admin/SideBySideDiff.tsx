"use client";

import { useMemo, useRef, useState } from "react";
import { diffLines, diffWordsWithSpace } from "diff";

// A reusable side-by-side (split) diff over jsdiff. Takes two raw strings — no precomputed
// patch. Pure adds/removes get a padded blank on the opposite side so lines stay aligned;
// modified blocks (a removed run immediately followed by an added run) are paired line-by-
// line and word-diffed with diffWordsWithSpace for intra-line highlighting. A toolbar
// scrolls between change rows. Used by the per-file Diff tab and the per-turn Changes tab.

type Cell = { num: number; text: string } | null;
type Row = { left: Cell; right: Cell; kind: "same" | "add" | "del" | "mod" };

function splitLines(value: string): string[] {
  return value.replace(/\n$/, "").split("\n");
}

function buildRows(oldText: string, newText: string): Row[] {
  const parts = diffLines(oldText, newText);
  const rows: Row[] = [];
  let lo = 0;
  let ro = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.added && !p.removed) {
      for (const line of splitLines(p.value))
        rows.push({ left: { num: ++lo, text: line }, right: { num: ++ro, text: line }, kind: "same" });
    } else if (p.removed && parts[i + 1]?.added) {
      const dels = splitLines(p.value);
      const adds = splitLines(parts[i + 1]!.value);
      const max = Math.max(dels.length, adds.length);
      for (let k = 0; k < max; k++)
        rows.push({
          left: k < dels.length ? { num: ++lo, text: dels[k] } : null,
          right: k < adds.length ? { num: ++ro, text: adds[k] } : null,
          kind: "mod",
        });
      i++; // consumed the paired added run
    } else if (p.removed) {
      for (const line of splitLines(p.value))
        rows.push({ left: { num: ++lo, text: line }, right: null, kind: "del" });
    } else {
      for (const line of splitLines(p.value))
        rows.push({ left: null, right: { num: ++ro, text: line }, kind: "add" });
    }
  }
  return rows;
}

// Render one line's text. For a modified row we word-diff old→new and show, per side, the
// common words plus that side's changes highlighted (removed on the left, added on the right).
function LineText({ row, side }: { row: Row; side: "left" | "right" }) {
  const cell = side === "left" ? row.left : row.right;
  if (cell == null) return null;
  if (row.kind === "mod" && row.left && row.right) {
    const parts = diffWordsWithSpace(row.left.text, row.right.text);
    return (
      <>
        {parts.map((p, i) => {
          if (side === "left" && p.added) return null;
          if (side === "right" && p.removed) return null;
          const hl = side === "left" ? p.removed : p.added;
          return (
            <span key={i} className={hl ? (side === "left" ? "bg-rose-500/30" : "bg-emerald-500/30") : ""}>
              {p.value}
            </span>
          );
        })}
      </>
    );
  }
  return <>{cell.text || " "}</>;
}

function Half({ row, side }: { row: Row; side: "left" | "right" }) {
  const cell = side === "left" ? row.left : row.right;
  const changed =
    (side === "left" && (row.kind === "del" || row.kind === "mod") && cell != null) ||
    (side === "right" && (row.kind === "add" || row.kind === "mod") && cell != null);
  const bg =
    cell == null
      ? "bg-zinc-950/40"
      : changed
        ? side === "left"
          ? "bg-rose-500/10"
          : "bg-emerald-500/10"
        : "";
  return (
    <div className={`flex w-1/2 min-w-0 ${side === "left" ? "border-r border-zinc-800" : ""} ${bg}`}>
      <span className="w-9 shrink-0 select-none px-1 text-right text-zinc-600">{cell?.num ?? ""}</span>
      <pre className="min-w-0 flex-1 overflow-hidden whitespace-pre px-2 text-zinc-200">
        <LineText row={row} side={side} />
      </pre>
    </div>
  );
}

export function SideBySideDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = useMemo(() => buildRows(oldText, newText), [oldText, newText]);
  const changeRows = useMemo(
    () => rows.map((r, i) => (r.kind !== "same" ? i : -1)).filter((i) => i >= 0),
    [rows],
  );
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const p of diffLines(oldText, newText)) {
      if (p.added) added += p.count ?? 0;
      else if (p.removed) removed += p.count ?? 0;
    }
    return { added, removed };
  }, [oldText, newText]);

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cursor, setCursor] = useState(0);
  const goto = (dir: 1 | -1) => {
    if (changeRows.length === 0) return;
    const next = (cursor + dir + changeRows.length) % changeRows.length;
    setCursor(next);
    rowRefs.current[changeRows[next]]?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1.5 font-mono text-xs">
        <span className="text-emerald-400">+{stats.added}</span>
        <span className="text-rose-400">-{stats.removed}</span>
        {changeRows.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              onClick={() => goto(-1)}
              className="rounded px-1.5 hover:bg-zinc-800"
              aria-label="Previous change"
            >
              ↑
            </button>
            <span className="tabular-nums text-zinc-500">
              {cursor + 1}/{changeRows.length}
            </span>
            <button
              type="button"
              onClick={() => goto(1)}
              className="rounded px-1.5 hover:bg-zinc-800"
              aria-label="Next change"
            >
              ↓
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-zinc-900 font-mono text-xs leading-5">
        {stats.added === 0 && stats.removed === 0 ? (
          <p className="p-4 text-zinc-500">No differences — identical.</p>
        ) : (
          rows.map((r, i) => (
            <div
              key={i}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className="flex"
            >
              <Half row={r} side="left" />
              <Half row={r} side="right" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
