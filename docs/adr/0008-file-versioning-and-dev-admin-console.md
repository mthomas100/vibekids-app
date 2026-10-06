# ADR 0008 — File version history + the dev admin console

> Index: `docs/decisions/LOG.md` (D19). Status: **Locked (v0), verified live** (both layers).
> Implements #11 / `ROADMAP.md` Phase-1 "Snapshots/undo", pulled early as a dev tool. Milestone: dev-experience.

## Context

A kid's app is rows in the Convex `files` table. The agent's tools **overwrite `content` in place** and
only bump a `version` integer (`convex/files.ts`), so `version` was a *write-counter* — every prior state
was destroyed and unrecoverable (the live `index.html` reached v45 with 44 lost states). No history, no
rollback, no diffs — and inspecting a kid's source meant squinting at raw HTML in the Convex dashboard.

Two needs converge: a **developer-experience** need (see/diff/restore what Sparky generated) now, and the
already-planned **kid-facing "time machine"** (#11) later. This ADR delivers the data model + the dev tool
now; the kid-facing layer (visual before/after + "go back") stays Phase 1 but its data dependencies land here.

## Decision

1. **Append-only `fileVersions` table — full snapshots, not deltas.** One immutable row per write
   (`{projectId, fileId, path, content, contentType, version, turnMessageId?, source, createdAt}`), with
   indexes `by_file` / `by_project` / `by_project_turn` / `by_file_version`. `files` stays HEAD (what the
   preview renders); `fileVersions` is history beside it.
2. **Snapshot INSIDE `files.write`, of the NEW state.** A single `recordVersion` choke point that every
   write path (write **and** rollback) funnels through — so "every write is versioned" is *structural*, not
   a per-call-site convention. Snapshotting the post-write state keeps the invariant
   **`files.version === max(fileVersions.version)`** for each file (history's head == HEAD).
3. **`turnMessageId` = the turn's avatar bubble**, threaded route → `createSparkyToolServer` → the 3 writers.
   Groups a turn's edits (the `by_project_turn` index) for the Phase-1 time machine. Captured now because it
   is unrecoverable later.
4. **Rollback reuses the write path → non-destructive.** Restoring vK writes vK's content as a NEW version
   (`source:"rollback"`); nothing is deleted, and you can roll forward again.
5. **Backfill baseline at each file's CURRENT version** (idempotent `internalMutation`), so legacy files get
   one honest baseline and the invariant holds immediately.
6. **Dev `/admin` console**, gated by `process.env.NODE_ENV !== "production"` (a Server Component that
   `notFound()`s in any prod build). Project picker → file list → **Rendered / Source / Diff** tabs + a
   version timeline with one-click rollback. Reuses the extracted `lib/preview/compose.ts` to render a
   historical snapshot in a sandboxed iframe (same opaque-origin attrs as the kid preview).
7. **One new dependency: `diff` (jsdiff).** Source is a plain monospace `<pre>` (no syntax-highlighter) —
   Sparky writes indented HTML that reads cleanly; the *diff* is where colour earns its place.

## Why

- **Structural safety over vigilance** (echoes L7): centralizing the snapshot in `write` means history can't
  be silently skipped, the same way the 6-tool sandbox makes the action space safe by construction.
- **Non-destructive rollback = git's mental model** — a restore is just another commit; you can never paint
  yourself into a corner, and the timeline never lies.
- **Full snapshots, not deltas** — Convex has no native delta storage and deltas would mean replay-on-read;
  at v0 scale (a few MB lifetime) full snapshots are simpler and correct. Deferred, not denied (below).
- **The data shape made it cheap:** every file in the DB is a self-contained HTML doc (no sibling refs), so
  rendering one historical snapshot is unambiguous, and the existing `compose()` is the renderer.

## Consequences / limitations

- **Storage grows** (full snapshots × every write). Fine at v0; revisit at Phase-2 scale — cap last-N /
  prune intermediate `edit` snapshots / switch hot files to deltas. (`needs-triage` filed.)
- **Historical render is per-file in isolation** — reconstructing a *whole multi-file project as of version
  N* is deferred (the `by_project_turn` index already supports it; the v1 UI doesn't assemble it).
- **The `NODE_ENV` gate is a v0 stopgap, not auth.** Real protection rides on **Phase-1 Clerk** (D7). The
  console lists *all* workspaces' projects — fine for local single-user dev, hardened before any real user.
- **Source tab is plain `<pre>`** — upgrade to `highlight.js` only if reading raw HTML proves painful.
  (`needs-triage` filed.)

## Status & revisit-trigger

**Locked for v0, verified live** (Convex MCP for the backend invariants + Claude-in-Chrome for the console;
prod build confirmed `/admin` 404s). Revisit when storage matters at scale (Phase 2) **or** the kid-facing
time machine (layer 3) is built (Phase 1) — at which point `turnMessageId` + `by_project_turn` are the seam.
