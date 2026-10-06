"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { SOURCE_STYLES } from "./sourceStyles";

// The version history for the open file. Clicking a row points the tabs at that
// snapshot; rolling back writes the chosen version's content as a NEW version
// (non-destructive — see fileVersions.rollback) and jumps the view to the new HEAD.
export function VersionTimeline({
  fileId,
  versions,
  headVersion,
  selectedVersion,
  onSelectVersion,
}: {
  fileId: Id<"files">;
  versions: Doc<"fileVersions">[]; // newest first
  headVersion: number;
  selectedVersion: number | null; // null = HEAD
  onSelectVersion: (v: number | null) => void;
}) {
  const rollback = useMutation(api.fileVersions.rollback);
  const [rollingBack, setRollingBack] = useState(false);
  const active = selectedVersion ?? headVersion;
  const viewingOld = selectedVersion !== null && selectedVersion !== headVersion;

  const doRollback = async () => {
    if (selectedVersion === null) return;
    setRollingBack(true);
    try {
      await rollback({ fileId, toVersion: selectedVersion });
      onSelectVersion(null); // jump to the new HEAD so the restored content is visible
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <aside className="flex w-64 min-w-64 flex-col border-l border-zinc-800">
      <h3 className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        History ({versions.length})
      </h3>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {versions.map((v) => {
          const isActive = v.version === active;
          const isHead = v.version === headVersion;
          return (
            <li key={v._id}>
              <button
                type="button"
                onClick={() => onSelectVersion(isHead ? null : v.version)}
                className={`flex w-full flex-col gap-1 border-b border-zinc-900 px-3 py-2 text-left transition-colors ${
                  isActive ? "bg-violet-600/15" : "hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">v{v.version}</span>
                  {isHead && <span className="text-xs text-emerald-400">current</span>}
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SOURCE_STYLES[v.source]}`}
                  >
                    {v.source}
                  </span>
                </div>
                <time className="text-xs text-zinc-500">
                  {new Date(v.createdAt).toLocaleString()}
                </time>
              </button>
            </li>
          );
        })}
      </ul>
      {viewingOld && (
        <div className="border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={doRollback}
            disabled={rollingBack}
            className="w-full rounded-md bg-fuchsia-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-500 disabled:opacity-60"
          >
            {rollingBack ? "Restoring…" : `↩ Roll back to v${selectedVersion}`}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-zinc-500">
            Creates a new version — nothing is lost.
          </p>
        </div>
      )}
    </aside>
  );
}
