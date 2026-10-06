"use client";

import type { Doc, Id } from "../../convex/_generated/dataModel";

// Lists every project across all workspaces (api.projects.listAll), newest first.
// Selecting one drives the file list + main panel.
export function ProjectPicker({
  projects,
  activeId,
  onSelect,
}: {
  projects: Doc<"projects">[] | undefined;
  activeId: Id<"projects"> | null;
  onSelect: (id: Id<"projects">) => void;
}) {
  return (
    <div className="border-b border-zinc-800 p-2">
      <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Projects {projects ? `(${projects.length})` : ""}
      </h2>
      {projects === undefined ? (
        <p className="px-2 py-1 text-sm text-zinc-600">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="px-2 py-1 text-sm text-zinc-600">No projects yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {projects.map((p) => {
            const active = p._id === activeId;
            return (
              <li key={p._id}>
                <button
                  type="button"
                  onClick={() => onSelect(p._id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? "bg-violet-600/20 text-violet-200" : "hover:bg-zinc-900"
                  }`}
                >
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {p.workspaceId} · {new Date(p.updatedAt).toLocaleDateString()}
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
