# ADR 0009 — Turn-grouped history (read-side) + pro admin viewers

> Index: `docs/decisions/LOG.md` (D20). Status: **Accepted (v0).** Builds on ADR 0008 (D19).
> Implements epic #30 (slices #31/#32; viewers #28); research: `docs/research/versioning-architecture.md`.
> Milestone: dev-experience + Phase-1 time-machine groundwork.

## Context

ADR 0008 landed history **per file** — each file has its own `version` timeline; the `/admin` console is
file-first (project → file → that file's versions). It explicitly deferred "reconstruct a whole
multi-file project as of version N" and named the seam: `turnMessageId` on every `fileVersions` row + the
`by_project_turn` index.

A 9-agent research fan-out (`docs/research/versioning-architecture.md`) found per-file-only history is the
one genuinely off-paradigm thing here: the entire peer field (v0, bolt, Lovable, Replit, WordPress,
Notion) groups a whole **build turn** into one restorable point ("checkpoint"/"version"/"revision"), and
nobody buys versioning off the shelf — the table + non-destructive rollback we already built **is** the
right substrate. The owner also reported two concrete viewer gaps: the Source tab has no syntax
highlighting; the Diff is inline, not side-by-side.

A restraint pass + a live measurement (`fileVersions:turnCoverage`, 2026-05-31) sized the problem: **21
rows total — 7 write/edit rows, all turn-stamped, across 5 distinct turns; 14 null-turn rows, all
`backfill` baselines** (~150 KB DB, ~1000× from any Convex cap). So turn-stamping is reliable on real
writes, and persisted commit tables are premature.

## Decision

1. **Adopt git's _model_, not its _machinery_.** A build TURN = a commit (an immutable snapshot of the
   whole file tree at that point). Do **not** run real git per project (isomorphic-git / Gitea / per-kid
   GitHub repos) — that's a second source of truth beside Convex (drift, a service to run) for users who
   are children, not developers. (Rejected alternatives catalogued in the research doc §10.)
2. **Group READ-SIDE — no persisted commit tables, no schema change.** A new `fileVersions.listProjectTurns`
   query groups existing rows by `turnMessageId` (via `by_project`/`by_project_turn`) into turn summaries.
   Null-turn rows (`backfill`, future `rollback`) become singleton "ungrouped" entries. The DB is tiny;
   a migration to `commits`/`commitFiles` would be a one-way door deprecating the verified ADR-0008
   substrate to express a grouping a query already gives for free.
3. **Reconstruct "whole project as of turn T" with a pure fold.** `reconstructTreeAsOf(rows, asOf)` =
   for each path, the row with the greatest `version` among rows with `createdAt <= asOf` (`version` is the
   jitter-proof within-path tiebreak; the `createdAt<=asOf` gate defines the point in time). Feed the
   result to the **existing** `compose(files, entryPath)` → renders the whole app as it stood, including
   files that turn didn't touch. This closes ADR 0008's deferred "project as of version N."
4. **Whole-turn rollback is non-destructive, through the existing choke point.** `rollbackProjectToTurn`
   re-writes each as-of-T file via a refactored shared `writeFile` helper in `convex/files.ts` (the body of
   `files.write`, which both it and `files.write` now call), so every write still funnels through
   `recordVersion` and the invariant `files.version === max(fileVersions.version)` holds. Lifts ADR 0008's
   per-file rollback to the project. **Limitation:** it cannot remove files created after T — there is no
   delete in the model (see Consequences).
5. **Viewers (decoupled, additive).** Source → **Shiki** (client singleton via `shiki/bundle/web`;
   supersedes ADR 0008's tentative highlight.js note — the "only if painful" trigger is met). Diff →
   hand-rolled **side-by-side** + intra-line over the already-installed `diff@9` (no new diff dep;
   `@git-diff-view`/Monaco rejected as heavy/pre-1.0 for a dev-only pane). Sole new dependency: `shiki`.
6. **`/admin` gets an additive `viewMode: "files" | "turns"` toggle.** The file-first view is unchanged.
   The **kid-facing** time machine (thumbnails + preview + "go back") stays Phase 1; the only capture-now
   piece (Sparky's `{emoji,category,summary}` per-turn label, #32) is a sibling slice, not in this ADR.

## Why

- **Same paradigm win, ~1–2 days, zero migration, fully reversible** — vs. a multi-day migration that
  deprecates a verified substrate for a 150 KB DB. Matches the field and honours the "don't reinvent the
  wheel / don't over-engineer" tension.
- **The seam was already there** (ADR 0008 §3): `turnMessageId` is stamped on every agent write (measured:
  7/7 write+edit rows), threaded route → `createSparkyToolServer` → the 3 writer tools.
- **Reactivity-safe** — turn reads hit `fileVersions`/`messages`/`projects`, never the `files` table the
  live kid preview subscribes to (L9/L12 discipline). The only `files` writes are rollback, which reuse the
  normal write path so the preview updates correctly.
- **Reuses what exists** — `compose()` already inlines a multi-file array; `diff@9` is installed;
  `recordVersion` stays the single snapshot choke point.

## Consequences / limitations

- **Whole-turn restore can't prune files added after T** (no soft-delete/tombstone in the model). Surfaced
  in the Restore UI ("files added later will stay"); `needs-triage` issue filed. Cosmetic for rendering —
  `compose` resolves from `entryPath`/`index.html`, so orphan files don't affect output.
- **Turn label = the turn's avatar-message text** (+ source + file count) until #32 adds a structured
  Sparky `{emoji,category,summary}`. The `TurnSummary` shape leaves room; no shape change when #32 lands.
- **`backfill` baselines show as singleton "ungrouped" entries** at their original timestamps (honest;
  measured 14 such rows). Per-project the count is a subset.
- **Read-side group-by + reconstruction recompute per view** — trivial at this scale; the explicit upgrade
  is persisted `commits`/`commitFiles` (#33) when read-side proves valuable AND a real access-pattern/scale
  pain appears. `entryPath` isn't versioned (v0) — reconstruction uses the project's current value.

## Status & revisit-trigger

**Accepted (v0).** Verify live per ADR 0008's recipe (`npx convex` / MCP for backend invariants +
Claude-in-Chrome for the console). **Revisit when:** read-side turn-grouping proves valuable **and** a real
scale/access-pattern pain appears → persist commits (#33, deferred); content-hash dedup (#27) / clone-to-
laptop (#34) stay behind their own triggers; the kid-facing time machine is built (Phase 1).
