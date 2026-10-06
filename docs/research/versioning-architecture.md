# Versioning / diff / admin-console architecture — research synthesis

> **Status: Reference (researched 2026-05-31, 9-agent Opus fan-out).** A genuine architecture
> decision (lean read-side vs. persisted commits) was **open for the owner** at the time —
> see §10. It was later resolved read-side as ADR 0009.
> Origin: the dev `/admin` time machine (ADR 0008) raised "am I reinventing the wheel?" — this is the
> answer, plus the patterns/frameworks/peer landscape behind it.

## 1. TL;DR — both instincts were right

- **Not reinventing the wheel.** An append-only snapshot table (full content) + non-destructive
  restore is *exactly* what every non-git CMS builds (WordPress, Notion, Ghost, Webflow, Wix,
  Val.town, Claude Artifacts). Versioning is **not a turnkey thing you buy** — the *mechanism* is a
  commodity (real git, or a snapshot table — **we own the table**); the *product* (turn-grouping,
  timeline UI, restore semantics, "what changed" labels) is built custom by **every** peer.
- **Not over-engineered.** No git runtime, full snapshots, linear history → we're in the majority,
  and our **non-destructive rollback** is in the *better* half (v0 + Lovable converged on
  "restore = a new version, like git revert", which we already do).
- **The one off-paradigm thing: per-file-only history.** The entire peer field groups a whole
  **turn** into one restorable point. The fix is to **group by turn, not by file** — and ADR 0008
  already left the seam: `turnMessageId` on every `fileVersions` row + the `by_project_turn` index.
- **The fix is cheap and read-side.** Measured DB = **~150 KB / 21 `fileVersions` rows** (largest
  file ~15 KB vs. the 1 MB cap). We are ~1000× from any storage limit, so **persisted commit tables
  are premature** — a read-side group-by over the existing index captures ~80% of the value in
  ~1–2 days with **no migration, no new tables, nothing irreversible.**

## 2. Peer landscape — how the field actually does it

| Product | Versioning unit | Real git under the hood? | Restore semantics | "What changed" label |
|---|---|---|---|---|
| **Replit** (gold standard) | per-project **checkpoint** = 1 git commit per turn | **Yes** (+ GitHub sync; content-addressed block storage) | destructive-forward | Agent's task summary |
| **Vercel v0** (closest *paradigm*) | **1 chat turn = 1 project version** | Yes (when GitHub-connected) | **non-destructive (append)** | prompt text, no diff |
| **bolt.new** | per-project version/"backup" | Yes (auto-commits) | non-destructive; preview+label+restore | user-editable name |
| **Lovable** | snapshot after every AI interaction | Yes (GitHub two-way) | **non-destructive ("like git revert")**; ⭐ favorite stable versions; date-grouped | prompt |
| **Cursor / Windsurf** | per-prompt checkpoint (local, ephemeral) | No (separate from git) | destructive-forward | — |
| **Claude Artifacts / GitHub Spark** (closest in *spirit*) | per-message version; one-click restore | Spark: yes (repo sync) | non-destructive | — |
| **Val.town** (closest *mechanically*) | auto-version on every file change | No (own DB) | non-destructive revert + diff | — |
| **WordPress / Notion / Ghost / Webflow / Wix / Framer** | revision/snapshot rows in their own DB | **No** | non-destructive (mostly) | author/date; WP has slider diff |

**Takeaways:** (1) project/turn-grouping is universal; per-file-only is the outlier. (2) Real git is
split — *developer-handoff* products (Replit/bolt/Lovable/v0/Spark) run it; *content/lightweight*
tools use a snapshot table. (3) **Almost nobody auto-generates a rich end-user "what changed"** — this
is the field's weak spot and our cheapest differentiator (Sparky already knows what it did).

## 3. Direct answers to the owner's questions

- **Library that does it better?** For *viewers* yes (§6). For the *versioning system*, no — build-vs-buy
  is already correctly settled on the snapshot table.
- **Right paradigm?** Project/turn-level grouping. **Per-file-only is the bug.**
- **Architecture that *literally* uses git?** Adopt git's **model**, not its **machinery** (§5).
- **Pull it all down locally?** Yes, **no git server needed** (§7).
- **Side-by-side navigable diff?** Yes, cheaply (§6).
- **Syntax highlighting?** Yes — **Shiki**, and the "only if painful" trigger (ADR 0008 / #28) is now
  met because the owner reported the pain (§6).
- **Versions that describe what changed?** Sparky emits `{emoji, category, summary}` per turn (§4) —
  industry-leading flourish, near-free.
- **Intuitive client/kid rollback?** Turn-level "time machine", Phase 1; non-destructive restore makes
  it fearless (§8).

## 4. Recommended path — lean now, trigger-gated later

| Concern | **Now** (v0, ~1–2 days, zero migration) | **Later** (only when a real trigger fires) |
|---|---|---|
| **Paradigm** | Read-side query grouping `fileVersions` by `turnMessageId` via the existing `by_project_turn` index → per-turn bundles. Render a whole turn via the existing `compose(files, entryPath)`. Whole-turn non-destructive rollback (restore each file via `files.write`). | Persist `commits` + `commitFiles` (§9) — when read-side grouping is *proven valuable* **and** scale bites. |
| **"What changed" label** | Sparky emits `{emoji, category, summary}` per turn, stored on the turn's avatar **message** (not a new table). **Capture-now: unrecoverable later.** Gitmoji-derived kid categories: ✨feat / 🐛fix / 🎨style / 📝content / 🎉first / ↩️rollback. | — |
| **Diff** | Side-by-side + intra-line over **`diff@9` (already installed)** — two columns, `diffLines` + `diffWordsWithSpace`, ~50 lines. No new dep. | `@git-diff-view/react` *only if* hand-rolled proves insufficient (caveats below). |
| **Source highlighting** | **Shiki** (server-rendered RSC, 0 KB client JS) — supersedes the ADR 0008 highlight.js note. | — |
| **Storage / git / clone** | Nothing. ~1000× from any cap. | Content-hash dedup (#27); export→git materializer (§7); kid Time Machine (Phase 1, §8). |

## 5. The git question — model, not machinery

**Adopt git's object model conceptually (immutable per-turn snapshot = "commit"), but do NOT run real
git as the backend.** Real-git-per-project (Replit/Lovable/bolt/Spark) exists because their users are
developers whose value prop is code ownership; VibeKids users are 8–12-year-olds with no accounts.
Running real repos means a **second source of truth beside Convex** (dual-write, drift, a
filesystem/service to operate, GitHub's 5k req/hr ceiling) — which displaces the very reason Convex was
chosen (ADR 0002: it's canonical and drives chat **and** the live preview reactively).

**Rejected backends:** Dolt/Fossil (version *tables*, not files; would shadow Convex's realtime),
isomorphic-git/nodegit/Gitea per project (infra for a code-host we aren't building). Revisit only if the
product itself becomes "host & serve real repos" (Phase 2 real-app-mode) or an adult-client export
mandate appears.

## 6. Library picks (corrected)

- **Syntax highlighting → `shiki`** (read-only, now). Server-render in an RSC via
  `await codeToHtml(content, { lang, theme })` + `dangerouslySetInnerHTML` → **0 KB highlighter JS** to
  the client; VS-Code TextMate grammars correctly highlight JS-in-HTML (what Sparky writes). It's the
  pattern Next 16's docs use, and `shiki` + `vscode-oniguruma` are already in Next 16's default
  `serverExternalPackages`. **Trigger met:** ADR 0008/#28 said "upgrade only if reading raw HTML proves
  painful" — the owner reported exactly that. Caller note: `FilePanel` is a client component, so render
  the Source view at a server boundary (or use Shiki's client recipe if it must live-update via Convex).
- **Diff → hand-roll two columns over `diff@9` (already installed).** `diffLines` for the gutter +
  `diffWordsWithSpace` for intra-line. ~50 lines, no new dep.
  - ⚠️ **Correction:** the end-state plan recommended `@git-diff-view/react` and claimed it "shares
    Shiki" — **it does not; it ships highlight.js/lowlight.** It's also v0.1.5 (pre-1.0) and ~1.3 MB.
    Keep it as an *optional later* upgrade, not a v0 dependency. Monaco DiffEditor is the only option
    with built-in next/prev-diff nav, but ~71 MB + `ssr:false` — overkill; the nav is ~30 lines of
    `scrollIntoView` over change anchors.
- **Editable kid editor → CodeMirror 6** (`@uiw/react-codemirror`), *later only*. Same engine Sandpack
  wraps. Skip Monaco; don't wait for Sandpack (not installed; ~1.18 MB + Stitches; not lean for
  read-only).

## 7. Local access — "pull it all down" (no git server)

- **Snapshot:** `npx convex export --include-file-storage` → a zip laid out as
  `<table>/documents.jsonl` (+ `_storage/`).
- **Materialize:** an ~80-line `scripts/pull.ts` reads `fileVersions/documents.jsonl`, groups by
  `turnMessageId`, and writes each project as a **real git repo — one commit per turn** (`--date` from
  `createdAt`, body = the matching chat message). Because content is a full snapshot, no delta
  reconstruction. Then **VS Code + `git log`/`git diff` give highlighting + side-by-side for free.**
- **Run offline:** `npx convex deployment select local && npx convex dev` runs the real OSS backend
  (SQLite, no account, same functions), seeded via `npx convex import`. Push edits back via existing
  **mutations** (`npx convex run`), never a raw `import --replace`.
- **Not supported / watch-items:** export is a frozen snapshot (no reactivity, no incremental sync —
  re-export to refresh); Fivetran/Airbyte streaming export is Pro-plan, one-way, analytics-only;
  Convex's offline object-sync engine is **beta, not GA** — don't design v0 around it.

## 8. Kid/client-facing "Time Machine" (Phase 1)

The whole field converges on one playbook, and we're ~80% aligned: plain vocabulary (restore / go back
/ checkpoint — never commit/branch/HEAD), a **date-grouped visual timeline**, **preview-before-restore**,
optional human-named ⭐ checkpoints over automatic saves, and **non-destructive restore** (undo the undo).
Kids should see **one timeline of builds** (turn-grouped) — each a **rendered thumbnail** (not code) +
the Sparky emoji label — tap to preview live → one big "Go back to this one" → friendly confirm →
success toast with [Undo]. Keep the per-file Source/Diff views strictly in the dev `/admin`. For
kid-facing "compare," show **two live rendered previews (Now | Then)**, never a code diff. Our
already-non-destructive rollback is the biggest asset — the UX can be fearless.

## 9. Trigger-gated end-state (for when scale actually bites — do NOT build in v0)

Additive to the live schema (`projects`/`files`/`messages` unchanged; `files` stays the live HEAD the
preview subscribes to):

```ts
commits: defineTable({
  projectId: v.id("projects"),
  seq: v.number(),                              // monotone per project = the "version"
  turnMessageId: v.optional(v.id("messages")),  // the turn (undefined for rollback/backfill)
  parentCommitId: v.optional(v.id("commits")),  // DAG seed; linear for v0; never shown to kids
  emoji: v.string(), summary: v.string(),
  category: v.union(/* feat | fix | style | content | first | rollback | backfill */),
  source: v.union(/* create | write | edit | rollback | backfill */),
  starred: v.optional(v.boolean()), label: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_project_seq", ["projectId", "seq"]).index("by_turn", ["turnMessageId"]),

commitFiles: defineTable({                      // one row per file in a commit = the flattened tree
  commitId: v.id("commits"), projectId: v.id("projects"),
  path: v.string(), contentType: v.string(),
  content: v.optional(v.string()),              // INLINE = the default
  contentHash: v.optional(v.string()),          // …OR sha-256 into a deferred `blobs` table (dedup)
  blobId: v.optional(v.id("_storage")),         // …OR Convex File Storage for the rare >1 MB file
}).index("by_commit", ["commitId"]).index("by_commit_path", ["commitId", "path"])
  .index("by_project_path", ["projectId", "path"]),
```

Migration mirrors the proven `backfillBaseline` recipe: dual-write at the `recordVersion` choke point,
then an idempotent `internalMutation` folding existing `fileVersions` into per-turn commits grouped by
`(projectId, turnMessageId)`. **Keystone to de-risk first:** "one turn ⇒ one commit ⇒ N commitFiles"
under serial within-turn writes. (Note: this keystone risk *only exists* because of the migration —
which is why the lean read-side path avoids it entirely.)

## 10. Rejected alternatives (roads not taken)

| Option | Why rejected |
|---|---|
| **Real git per project** (isomorphic-git / nodegit / Gitea / per-kid GitHub repos) | Second source of truth beside Convex; for developer-handoff products, not 8–12-yos. Get git's benefits via its model. |
| **Dolt / Fossil ("git for data")** | Version *tables*, not files; would shadow Convex's realtime (the reason we chose it); +$50/mo hosted. |
| **Full event-sourcing (fold-on-read)** | We already maintain the projection eagerly (the snapshot); fold-on-read fights Convex's 1 s / 16 MiB-txn budget + reactivity. Keep the spirit (append-only, `source` enum). |
| **Whole tree in one doc per commit** | Worst Convex fit (1 MB/doc + 8192-array caps; hot-rewrite; no dedup). `commitFiles` rows are this made safe. |
| **Full git object store (separate `trees` table) / matching git oids** | Over-engineering for 1–10-file projects; the `commitFiles` join *is* the flattened tree. |
| **Convex Ents for the relationships** | In maintenance mode; hand-rolled `v.id()` + indexes is lower-risk (Convex's own best-practice). |
| **Branching / PRs / named-checkpoints in the kid UI now** | Linear + non-destructive restore covers >95%; "branch" is banned kid vocabulary. `parentCommitId` seeds a DAG for free if ever needed. |
| **Destructive-forward restore** (Replit/Wix/Cursor style) | The better products are non-destructive (v0/Lovable/WP) — which we already are. Destructive = scary dialogs, the opposite of fearless. |
| **`@git-diff-view/react` / Monaco as v0 deps** | Pre-1.0 / heavy for a dev-only pane; `diff@9` is already installed and sufficient. |
| **Persisted `commits`+`commitFiles` NOW** | The DB is ~150 KB; a migration + deprecation of the verified `fileVersions` substrate to express a grouping a single query already gives = a one-way door for no v0 benefit. |
| **Shiki vs. highlight.js** | Shiki wins (TextMate JS-in-HTML, 0 KB RSC output, no CVE churn); supersedes ADR 0008's highlight.js note. |

## 11. Staged plan

- **Stage A (now, ~1–2 d, no migration):** read-side turn-grouping query · whole-turn render via
  `compose()` · whole-turn rollback · side-by-side `diff@9` view · Shiki Source · Sparky `{emoji,
  category, summary}` per-turn label on the message. → epic issue + slices.
- **Stage B (Phase 1):** kid-facing Time Machine (thumbnails, preview, "go back", ⭐ checkpoints). → #11.
- **Stage C (deferred, trigger-gated):** persist `commits`/`commitFiles` (§9); content-hash dedup (#27);
  export→git materializer + local backend (§7).

## Key sources

Replit snapshot engine (blog.replit.com/inside-replits-snapshot-engine) · v0 Versions (v0.app/docs/versions)
· Bolt version history (support.bolt.new) · Lovable Versioning 2.0 (lovable.dev/blog) · WordPress
revisions (wordpress.org/documentation/article/revisions) · Pro Git Internals — Git Objects
(git-scm.com/book/en/v2/Git-Internals-Git-Objects) · isomorphic-git (github.com/isomorphic-git) · Dolt
(github.com/dolthub/dolt) · Convex limits / export / file-storage / best-practices (docs.convex.dev) ·
Shiki + Next 16 `serverExternalPackages` · `diff` v9 · CodeMirror 6 (`@uiw/react-codemirror`). Full
per-stream citation lists are archived elsewhere.
