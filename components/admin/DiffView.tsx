"use client";

import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { SideBySideDiff } from "./SideBySideDiff";

// Compare any two versions of one file. Owns the from→to version selection; the actual
// rendering (side-by-side, syntax-aware alignment, intra-line highlight, change nav) is
// the shared SideBySideDiff component (also used by the per-turn Changes tab).
export function DiffView({ versions }: { versions: Doc<"fileVersions">[] }) {
  const asc = [...versions].sort((a, b) => a.version - b.version);
  const latest = asc[asc.length - 1].version;
  const prev = asc.length > 1 ? asc[asc.length - 2].version : latest;
  const [aVer, setAVer] = useState(prev);
  const [bVer, setBVer] = useState(latest);

  const a = versions.find((v) => v.version === aVer);
  const b = versions.find((v) => v.version === bVer);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-sm">
        <VersionSelect label="from" value={aVer} onChange={setAVer} versions={asc} />
        <span className="text-zinc-500">→</span>
        <VersionSelect label="to" value={bVer} onChange={setBVer} versions={asc} />
      </div>
      <div className="min-h-0 flex-1">
        {aVer === bVer ? (
          <p className="p-4 text-sm text-zinc-500">
            Same version — pick two different versions to compare.
          </p>
        ) : a && b ? (
          <SideBySideDiff oldText={a.content} newText={b.content} />
        ) : null}
      </div>
    </div>
  );
}

function VersionSelect({
  label,
  value,
  onChange,
  versions,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  versions: Doc<"fileVersions">[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded bg-zinc-800 px-2 py-1 text-zinc-200"
      >
        {versions.map((v) => (
          <option key={v._id} value={v.version}>
            v{v.version} ({v.source})
          </option>
        ))}
      </select>
    </label>
  );
}
