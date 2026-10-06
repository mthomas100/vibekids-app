"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { TurnSummary } from "../../convex/fileVersions";
import { compose } from "../../lib/preview/compose";
import { reconstructTreeAsOf } from "../../lib/preview/reconstruct";
import { SideBySideDiff } from "./SideBySideDiff";
import { SandboxedPreview } from "./SandboxedPreview";
import { SourceChip } from "./sourceStyles";

type Tab = "rendered" | "changes" | "files";

// The main panel for one TURN (a project-level "commit"). Reads the project's full version
// history (content-bearing) + the project doc for entryPath — never the `files` table, so
// it adds no subscription pressure to the live kid preview. Renders the WHOLE app as of
// this turn (reconstruct → compose), a per-file Changes diff, a file manifest, and a
// non-destructive whole-turn Restore. Remount via key={turnKey} resets the tab per turn.
export function TurnPanel({
  projectId,
  turn,
}: {
  projectId: Id<"projects">;
  turn: TurnSummary;
}) {
  const rows = useQuery(api.fileVersions.listForProject, { projectId });
  const project = useQuery(api.projects.get, { projectId });
  const rollback = useMutation(api.fileVersions.rollbackProjectToTurn);
  const [tab, setTab] = useState<Tab>("rendered");
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  // The whole file tree as it stood at the end of this turn.
  const tree = useMemo(
    () =>
      rows
        ? reconstructTreeAsOf(
            rows.map((r) => ({
              path: r.path,
              content: r.content,
              contentType: r.contentType,
              version: r.version,
              createdAt: r.createdAt,
            })),
            turn.lastCreatedAt,
          )
        : [],
    [rows, turn.lastCreatedAt],
  );

  // Per-path version history (ascending) — backs the Changes/Files tabs.
  const byPath = useMemo(() => {
    const m = new Map<string, Doc<"fileVersions">[]>();
    if (rows)
      for (const r of rows) {
        const arr = m.get(r.path) ?? [];
        arr.push(r);
        m.set(r.path, arr);
      }
    for (const arr of m.values()) arr.sort((a, b) => a.version - b.version);
    return m;
  }, [rows]);

  // Files first written AFTER this turn — whole-turn restore leaves these in place (no
  // delete in the model; ADR 0009). Computed from history, so no `files`-table read.
  const laterPaths = useMemo(() => {
    if (!rows) return [];
    const earliest = new Map<string, number>();
    for (const r of rows)
      earliest.set(r.path, Math.min(earliest.get(r.path) ?? Infinity, r.createdAt));
    return [...earliest.entries()]
      .filter(([, t]) => t > turn.lastCreatedAt)
      .map(([p]) => p);
  }, [rows, turn.lastCreatedAt]);

  if (rows === undefined) return <Center>Loading turn…</Center>;

  // Prefer the turn's own HTML file as the preview entry (so a "cookies" turn shows
  // cookies.html), falling back to the project's configured entry.
  const entry = turn.paths.find((p) => p.endsWith(".html")) ?? project?.entryPath;

  const versionAsOf = (path: string) => {
    const vs = byPath.get(path) ?? [];
    let chosen: Doc<"fileVersions"> | undefined;
    for (const v of vs) if (v.createdAt <= turn.lastCreatedAt) chosen = v;
    return chosen;
  };
  const versionBefore = (path: string, version: number) => {
    const vs = byPath.get(path) ?? [];
    let chosen: Doc<"fileVersions"> | undefined;
    for (const v of vs) if (v.version < version) chosen = v;
    return chosen;
  };

  const doRestore = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const res = await rollback({ projectId, asOf: turn.lastCreatedAt });
      setRestoreMsg(
        `Restored ${res.restored} file${res.restored === 1 ? "" : "s"}` +
          (res.skipped ? ` (${res.skipped} already current)` : "") +
          " — nothing lost.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Turn header */}
      <div className="flex items-start gap-3 border-b border-zinc-800 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SourceChip source={turn.source} />
            <span className="text-sm font-medium text-zinc-100">{turn.label}</span>
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {new Date(turn.lastCreatedAt).toLocaleString()} · {turn.fileCount} file
            {turn.fileCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={doRestore}
            disabled={restoring}
            className="rounded-md bg-fuchsia-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-fuchsia-500 disabled:opacity-60"
          >
            {restoring ? "Restoring…" : "↩ Restore this version"}
          </button>
          <span className="text-[11px] text-zinc-500">
            Creates new versions — nothing is lost.
          </span>
        </div>
      </div>

      {restoreMsg && (
        <div className="border-b border-emerald-800/50 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300">
          {restoreMsg}
        </div>
      )}
      {laterPaths.length > 0 && (
        <div className="border-b border-amber-800/40 bg-amber-500/5 px-4 py-1.5 text-[11px] text-amber-300/90">
          Note: {laterPaths.length} file{laterPaths.length === 1 ? "" : "s"}{" "}
          added after this point will stay (VibeKids can&apos;t remove files yet).
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800 px-4 py-2">
        {(["rendered", "changes", "files"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-sm capitalize transition-colors ${
              tab === t ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "rendered" ? (
          <RenderedTurn tree={tree} entry={entry} />
        ) : tab === "changes" ? (
          <div className="h-full overflow-auto">
            {turn.paths.map((path) => {
              const after = versionAsOf(path);
              if (!after) return null;
              const before = versionBefore(path, after.version);
              return (
                <details key={path} open className="border-b border-zinc-800">
                  <summary className="cursor-pointer px-4 py-2 font-mono text-sm text-zinc-200">
                    {path}{" "}
                    <span className="text-zinc-500">
                      {before ? `v${before.version} → v${after.version}` : "new file"}
                    </span>
                  </summary>
                  <div className="h-[340px] border-t border-zinc-800">
                    <SideBySideDiff oldText={before?.content ?? ""} newText={after.content} />
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <ul className="h-full overflow-auto p-2">
            {turn.paths.map((path) => {
              const after = versionAsOf(path);
              return (
                <li
                  key={path}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-zinc-900"
                >
                  <span className="truncate font-mono text-sm text-zinc-200">{path}</span>
                  {after && (
                    <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                      v{after.version}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function RenderedTurn({
  tree,
  entry,
}: {
  tree: { path: string; content: string; contentType: string }[];
  entry: string | undefined;
}) {
  const srcDoc = tree.length ? compose(tree, entry) : null;
  if (!srcDoc)
    return <Center>Nothing to render at this point — try the Files tab.</Center>;
  return <SandboxedPreview srcDoc={srcDoc} title="App at this turn" />;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-zinc-500">
      {children}
    </div>
  );
}
