"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Files (HEAD rows) for the selected project, with the current version badge.
// Reuses api.files.listForProject — the same live query the kid-facing preview uses.
export function FileList({
  projectId,
  activeId,
  onSelect,
}: {
  projectId: Id<"projects">;
  activeId: Id<"files"> | null;
  onSelect: (id: Id<"files">) => void;
}) {
  const files = useQuery(api.files.listForProject, { projectId });
  const sorted = files ? [...files].sort((a, b) => a.path.localeCompare(b.path)) : [];

  return (
    <div className="p-2">
      <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Files {files ? `(${files.length})` : ""}
      </h2>
      {files === undefined ? (
        <p className="px-2 py-1 text-sm text-zinc-600">Loading…</p>
      ) : files.length === 0 ? (
        <p className="px-2 py-1 text-sm text-zinc-600">No files yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {sorted.map((f) => {
            const active = f._id === activeId;
            return (
              <li key={f._id}>
                <button
                  type="button"
                  onClick={() => onSelect(f._id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? "bg-violet-600/20 text-violet-200" : "hover:bg-zinc-900"
                  }`}
                >
                  <span className="truncate font-mono text-sm">{f.path}</span>
                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    v{f.version}
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
