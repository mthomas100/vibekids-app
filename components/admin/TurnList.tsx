"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TurnSummary } from "../../convex/fileVersions";
import { SourceChip } from "./sourceStyles";

// The project's build TURNS, newest-first — the "commit" timeline (read-side group of
// fileVersions by turnMessageId). The turn analog of FileList. Clicking lifts the whole
// TurnSummary up so TurnPanel needs no re-query.
export function TurnList({
  projectId,
  activeKey,
  onSelect,
}: {
  projectId: Id<"projects">;
  activeKey: string | null;
  onSelect: (turn: TurnSummary) => void;
}) {
  const turns = useQuery(api.fileVersions.listProjectTurns, { projectId });

  return (
    <div className="p-2">
      <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Turns {turns ? `(${turns.length})` : ""}
      </h2>
      {turns === undefined ? (
        <p className="px-2 py-1 text-sm text-zinc-600">Loading…</p>
      ) : turns.length === 0 ? (
        <p className="px-2 py-1 text-sm text-zinc-600">No history yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {turns.map((t) => {
            const active = t.turnKey === activeKey;
            return (
              <li key={t.turnKey}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className={`flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? "bg-violet-600/20 text-violet-200" : "hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SourceChip source={t.source} />
                    <time className="ml-auto text-[11px] text-zinc-500">
                      {new Date(t.lastCreatedAt).toLocaleString()}
                    </time>
                  </div>
                  <span className="line-clamp-2 text-sm text-zinc-200">{t.label}</span>
                  <span className="truncate font-mono text-[11px] text-zinc-500">
                    {t.paths[0]}
                    {t.fileCount > 1 ? ` +${t.fileCount - 1}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
