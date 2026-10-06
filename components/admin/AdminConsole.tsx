"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TurnSummary } from "../../convex/fileVersions";
import { ProjectPicker } from "./ProjectPicker";
import { FileList } from "./FileList";
import { FilePanel } from "./FilePanel";
import { TurnList } from "./TurnList";
import { TurnPanel } from "./TurnPanel";

type ViewMode = "files" | "turns";

// The dev admin console. Dark-themed on purpose — a developer tool, visually distinct from
// the kid-facing app. Holds selection state and a Files | Turns view toggle: "files" is the
// per-file history (pick file → versions); "turns" is the project "commit" timeline (each
// build turn → the whole app as of that turn + restore). Gated by app/admin/page.tsx
// (NODE_ENV; not for kids).
export function AdminConsole() {
  const projects = useQuery(api.projects.listAll);
  const [pickedProjectId, setPickedProjectId] = useState<Id<"projects"> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("files");
  const [fileId, setFileId] = useState<Id<"files"> | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<TurnSummary | null>(null);

  // Default to the most-recent project until the dev picks another.
  const projectId = pickedProjectId ?? projects?.[0]?._id ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
        <span className="font-bold tracking-tight">VibeKids Admin</span>
        <span className="text-sm text-zinc-500">code &amp; version history · dev only</span>
        <div className="ml-auto flex gap-1">
          {(["files", "turns"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                viewMode === m ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {m === "turns" ? "Turns (commits)" : "Files"}
            </button>
          ))}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 min-w-72 flex-col overflow-y-auto border-r border-zinc-800">
          <ProjectPicker
            projects={projects}
            activeId={projectId}
            onSelect={(id) => {
              setPickedProjectId(id);
              setFileId(null);
              setSelectedTurn(null);
            }}
          />
          {projectId &&
            (viewMode === "files" ? (
              <FileList projectId={projectId} activeId={fileId} onSelect={setFileId} />
            ) : (
              <TurnList
                projectId={projectId}
                activeKey={selectedTurn?.turnKey ?? null}
                onSelect={setSelectedTurn}
              />
            ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          {viewMode === "files" ? (
            fileId ? (
              <FilePanel key={fileId} fileId={fileId} />
            ) : (
              <Empty>Pick a project, then a file, to inspect its source, history, and diffs.</Empty>
            )
          ) : selectedTurn && projectId ? (
            <TurnPanel key={selectedTurn.turnKey} projectId={projectId} turn={selectedTurn} />
          ) : (
            <Empty>Pick a turn to see the whole app as it was, what changed, and restore it.</Empty>
          )}
        </main>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-zinc-600">
      {children}
    </div>
  );
}
