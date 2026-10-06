import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { recordVersion, writeFile } from "./files";
import type { Doc, Id } from "./_generated/dataModel";
import { reconstructTreeAsOf } from "../lib/preview/reconstruct";

// Version history for one file, newest first — the admin timeline + rollback list.
export const listForFile = query({
  args: { fileId: v.id("files") },
  handler: (ctx, { fileId }) =>
    ctx.db
      .query("fileVersions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .order("desc")
      .collect(),
});

// Every snapshot in a project, newest first — the project-wide activity feed (and the
// seed for the Phase-1 turn-grouped time machine, via the by_project_turn index).
export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: (ctx, { projectId }) =>
    ctx.db
      .query("fileVersions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect(),
});

// One specific snapshot — backs the Rendered / Source / Diff panes.
export const get = query({
  args: { fileId: v.id("files"), version: v.number() },
  handler: (ctx, { fileId, version }) =>
    ctx.db
      .query("fileVersions")
      .withIndex("by_file_version", (q) =>
        q.eq("fileId", fileId).eq("version", version),
      )
      .unique(),
});

// Restore an older version. NON-DESTRUCTIVE: writes the old content as a NEW version
// (source "rollback") through the same recordVersion choke point, so nothing is ever
// lost and you can roll forward again. The live file + preview update reactively.
export const rollback = mutation({
  args: { fileId: v.id("files"), toVersion: v.number() },
  handler: async (ctx, { fileId, toVersion }) => {
    const snapshot = await ctx.db
      .query("fileVersions")
      .withIndex("by_file_version", (q) =>
        q.eq("fileId", fileId).eq("version", toVersion),
      )
      .unique();
    if (!snapshot) throw new Error(`No version ${toVersion} for file ${fileId}.`);
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error(`File ${fileId} no longer exists.`);
    const now = Date.now();
    const version = file.version + 1;
    await ctx.db.patch(fileId, {
      content: snapshot.content,
      contentType: snapshot.contentType,
      version,
      updatedAt: now,
    });
    await ctx.db.patch(file.projectId, { updatedAt: now }); // preview re-renders reactively
    await recordVersion(ctx, {
      projectId: file.projectId,
      fileId,
      path: file.path,
      content: snapshot.content,
      contentType: snapshot.contentType,
      version,
      turnMessageId: undefined, // a rollback isn't a build turn
      source: "rollback",
      now,
    });
    return version;
  },
});

// One-off migration: give every existing file a single baseline snapshot at its
// CURRENT version, so files written before fileVersions existed (e.g. index.html at
// version 45, with versions 1-44 already overwritten and lost) have continuous,
// honest history going forward.
//
// Idempotent: skips any file that already has a snapshot at its HEAD version — so it's
// safe to re-run, and safe to run AFTER the snapshot-on-write change has started
// capturing new writes (those files are skipped; only untouched legacy files get a
// baseline). Internal-only: never reachable from the browser.
//
// Run it via:  npx convex run fileVersions:backfillBaseline '{"dryRun": true}'  (observe)
//        then: npx convex run fileVersions:backfillBaseline                      (for real)
export const backfillBaseline = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const files = await ctx.db.query("files").collect();
    let inserted = 0;
    let skipped = 0;
    for (const file of files) {
      const already = await ctx.db
        .query("fileVersions")
        .withIndex("by_file_version", (q) =>
          q.eq("fileId", file._id).eq("version", file.version),
        )
        .unique();
      if (already) {
        skipped++;
        continue;
      }
      if (!dryRun) {
        await ctx.db.insert("fileVersions", {
          projectId: file.projectId,
          fileId: file._id,
          path: file.path,
          content: file.content,
          contentType: file.contentType,
          // Baseline at the file's CURRENT version (its true history before this is
          // unrecoverable). Keeps the invariant files.version === max(version) intact.
          version: file.version,
          turnMessageId: undefined,
          source: "backfill",
          createdAt: file.updatedAt,
        });
      }
      inserted++;
    }
    return { scanned: files.length, inserted, skipped, dryRun: dryRun ?? false };
  },
});

// Diagnostics (internal-only): how coherent will read-side turn-grouping be? Counts how
// many fileVersions rows carry a turnMessageId (the grouping key) vs not, the number of
// distinct turns, and a per-source breakdown. Read-only; never reachable from the browser.
// Run: npx convex run fileVersions:turnCoverage
export const turnCoverage = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("fileVersions").collect();
    const withTurn = rows.filter((r) => r.turnMessageId != null);
    const distinctTurns = new Set(withTurn.map((r) => String(r.turnMessageId))).size;
    const bySource = rows.reduce<Record<string, number>>((m, r) => {
      m[r.source] = (m[r.source] ?? 0) + 1;
      return m;
    }, {});
    return {
      total: rows.length,
      withTurn: withTurn.length,
      withoutTurn: rows.length - withTurn.length,
      distinctTurns,
      bySource,
    };
  },
});

// ─── Turn-grouped history (read-side; ADR 0009) ──────────────────────────────
// A "turn" = one Sparky build turn = a project-level commit. We GROUP existing
// fileVersions by turnMessageId (no new tables). Null-turn rows (backfill/rollback)
// become singleton "ungrouped" entries. These reads hit fileVersions + messages ONLY —
// never the `files` table the live kid preview subscribes to (reactivity safety).

export type TurnSummary = {
  turnKey: string; // messageId string, or `nogroup:<rowId>` for null-turn singletons
  turnMessageId: Id<"messages"> | null;
  kind: "turn" | "ungrouped";
  label: string; // the turn's avatar-message text (until #32 adds a structured label)
  source: Doc<"fileVersions">["source"]; // headline provenance → drives the chip
  paths: string[]; // distinct file paths touched, sorted
  fileCount: number;
  versionCount: number; // total fileVersions rows in the group
  firstCreatedAt: number;
  lastCreatedAt: number; // ordering key + the "as of T" timestamp for reconstruction
};

// Headline source for the chip: the most meaningful provenance present in the group.
const SOURCE_PRECEDENCE: Doc<"fileVersions">["source"][] = [
  "create",
  "rollback",
  "backfill",
  "edit",
  "write",
];
function headlineSource(
  sources: Doc<"fileVersions">["source"][],
): Doc<"fileVersions">["source"] {
  for (const s of SOURCE_PRECEDENCE) if (sources.includes(s)) return s;
  return sources[0] ?? "write";
}

// First non-empty line of the turn's avatar narration, collapsed + capped. null → the
// caller synthesizes a fallback label.
function deriveTurnLabel(text: string | undefined | null): string | null {
  if (!text) return null;
  const first = text.trim().split("\n")[0]?.replace(/\s+/g, " ").trim();
  if (!first) return null;
  return first.length > 80 ? first.slice(0, 79) + "…" : first;
}

// Project-wide turn timeline, newest-first — the admin "commit" list. One entry per turn
// (+ one singleton per null-turn row). Content is intentionally stripped (the list is
// cheap; full content is fetched only when a turn is opened, via listForProject).
export const listProjectTurns = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<TurnSummary[]> => {
    const rows = await ctx.db
      .query("fileVersions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();

    type Acc = {
      turnMessageId: Id<"messages"> | null;
      kind: "turn" | "ungrouped";
      paths: Set<string>;
      sources: Doc<"fileVersions">["source"][];
      versionCount: number;
      firstCreatedAt: number;
      lastCreatedAt: number;
    };
    const groups = new Map<string, Acc>();
    for (const r of rows) {
      const isTurn = r.turnMessageId != null;
      const key = isTurn ? String(r.turnMessageId) : `nogroup:${r._id}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          turnMessageId: isTurn ? r.turnMessageId! : null,
          kind: isTurn ? "turn" : "ungrouped",
          paths: new Set(),
          sources: [],
          versionCount: 0,
          firstCreatedAt: r.createdAt,
          lastCreatedAt: r.createdAt,
        };
        groups.set(key, g);
      }
      g.paths.add(r.path);
      g.sources.push(r.source);
      g.versionCount += 1;
      g.firstCreatedAt = Math.min(g.firstCreatedAt, r.createdAt);
      g.lastCreatedAt = Math.max(g.lastCreatedAt, r.createdAt);
    }

    const summaries: TurnSummary[] = [];
    for (const [turnKey, g] of groups) {
      const source = headlineSource(g.sources);
      const paths = [...g.paths].sort();
      let label: string | null = null;
      if (g.turnMessageId) {
        const msg = await ctx.db.get(g.turnMessageId);
        label = deriveTurnLabel(msg?.text);
      }
      if (!label) {
        label =
          g.kind === "ungrouped"
            ? `${source} · ${paths[0] ?? "—"}`
            : `${g.paths.size} file${g.paths.size === 1 ? "" : "s"} · ${source}`;
      }
      summaries.push({
        turnKey,
        turnMessageId: g.turnMessageId,
        kind: g.kind,
        label,
        source,
        paths,
        fileCount: g.paths.size,
        versionCount: g.versionCount,
        firstCreatedAt: g.firstCreatedAt,
        lastCreatedAt: g.lastCreatedAt,
      });
    }
    summaries.sort(
      (a, b) => b.lastCreatedAt - a.lastCreatedAt || a.turnKey.localeCompare(b.turnKey),
    );
    return summaries;
  },
});

// Restore the WHOLE project to its state as of a turn (identified by the turn's max
// createdAt). NON-DESTRUCTIVE: re-writes each as-of-T file as a NEW version via the shared
// writeFile choke point (source "rollback"), so recordVersion runs and the invariant
// files.version === max(fileVersions.version) is preserved per file. Files created AFTER
// the turn are LEFT IN PLACE — there is no delete in the model (ADR 0009 limitation).
// Skips no-op writes where HEAD already matches, so identical versions aren't churned.
export const rollbackProjectToTurn = mutation({
  args: { projectId: v.id("projects"), asOf: v.number() },
  handler: async (ctx, { projectId, asOf }) => {
    const rows = await ctx.db
      .query("fileVersions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const tree = reconstructTreeAsOf(
      rows.map((r) => ({
        path: r.path,
        content: r.content,
        contentType: r.contentType,
        version: r.version,
        createdAt: r.createdAt,
      })),
      asOf,
    );
    let restored = 0;
    let skipped = 0;
    for (const f of tree) {
      const head = await ctx.db
        .query("files")
        .withIndex("by_project_path", (q) =>
          q.eq("projectId", projectId).eq("path", f.path),
        )
        .unique();
      if (head && head.content === f.content && head.contentType === f.contentType) {
        skipped += 1;
        continue;
      }
      await writeFile(ctx, {
        projectId,
        path: f.path,
        content: f.content,
        contentType: f.contentType,
        source: "rollback",
      });
      restored += 1;
    }
    return { restored, skipped, files: tree.length, asOf };
  },
});
