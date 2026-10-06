import type { Doc } from "../../convex/_generated/dataModel";

// One colour per provenance, so a glance shows how a version/turn came to be. Shared by
// VersionTimeline (per-file), TurnList + TurnPanel (per-turn) — extracted so all three agree.
export const SOURCE_STYLES: Record<Doc<"fileVersions">["source"], string> = {
  create: "bg-emerald-500/15 text-emerald-300",
  write: "bg-sky-500/15 text-sky-300",
  edit: "bg-amber-500/15 text-amber-300",
  rollback: "bg-fuchsia-500/15 text-fuchsia-300",
  backfill: "bg-zinc-600/30 text-zinc-400",
};

export function SourceChip({ source }: { source: Doc<"fileVersions">["source"] }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SOURCE_STYLES[source]}`}
    >
      {source}
    </span>
  );
}
