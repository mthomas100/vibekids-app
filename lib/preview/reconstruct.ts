import type { FileLike } from "./compose";

// One fileVersions row reduced to the fields the fold needs. Structurally a subset of
// Doc<"fileVersions">, so callers pass rows straight from api.fileVersions.listForProject.
export type SnapshotRow = {
  path: string;
  content: string;
  contentType: string;
  version: number;
  createdAt: number;
};

// Reconstruct the whole project's file tree AS OF a point in time: for each distinct
// path, the row with the greatest `version` among rows with createdAt <= asOf. Paths
// whose first write is after `asOf` are excluded (they didn't exist yet). Pure + total.
//
// Why `version` is the within-path tiebreak (not createdAt): files.version is strictly
// monotonic per file (bumped by 1 each write), whereas several files written in the SAME
// turn can share one createdAt (same Date.now() ms). The createdAt <= asOf gate selects
// the eligible window; `version` picks the head within each path's eligible rows — robust
// even if two rows ever shared a millisecond.
//
// Pass asOf = the target turn's lastCreatedAt (the max createdAt of its group) so a turn
// that wrote several files a few ms apart includes all of them.
export function reconstructTreeAsOf(rows: SnapshotRow[], asOf: number): FileLike[] {
  const latestByPath = new Map<string, SnapshotRow>();
  for (const r of rows) {
    if (r.createdAt > asOf) continue; // not yet written at time T
    const cur = latestByPath.get(r.path);
    if (!cur || r.version > cur.version) latestByPath.set(r.path, r);
  }
  return [...latestByPath.values()].map(({ path, content, contentType }) => ({
    path,
    content,
    contentType,
  }));
}
