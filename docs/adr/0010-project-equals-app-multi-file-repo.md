# ADR 0010 — Project = app = a multi-file repo; workspace = the shelf

> Index: `docs/decisions/LOG.md` (D21). Status: **Accepted (v0) — [USER CALL].** Builds on ADR 0009 (D20).
> The unit-of-an-app decision behind the M5 shelf and the eventual React bridge.

## Context

v0 shipped with a conflation, surfaced live (`/admin`): the kid app creates **one** project per
workspace (`app/page.tsx` always uses `projects[0]`) and the agent writes every new idea as a **new
`.html` file** in it (the route even tells it "don't `create_project`" once files exist). So one
project — "My First App" — accumulated 13 unrelated apps (cookie shop, dino, zombie, …), and the
turn-commit timeline (ADR 0009) interleaved them. That contradicts the schema's own intent
(`projects: A buildable app`) and the owner's mental model.

The owner's call (2026-05-31): **a project should be one app — a real multi-file codebase (files +
subfolders + project-level version control), exactly like a git repo** — and that multi-file model is
the **bridge out of the toy "everything in one HTML file" model toward real React apps.** The single
question raised — does a workspace hold one app or many — resolves by keeping **project = app = repo**
as the atomic unit and **workspace = a flat collection (shelf) of projects** (the git/GitHub split:
repo = app, user/org = workspace). Don't model "a project containing multiple apps."

Key enabling fact: the substrate **already supports this.** `files.path` is a free-form string
(`src/App.jsx` works — folders are free), `compose()` already inlines a *multi-file* vanilla tree, and
the agent's `write_file` already writes arbitrary paths. The single-HTML habit is a *persona/template*
choice, not an engine limit. Real React (JSX + imports) is the one piece that needs a bundler — which
is exactly the already-decided Sandpack Tier B (ADR 0003 / M3), not new research.

## Decision

1. **Project = app = repo.** One app per project: a tree of files (with subfolders via `path`) +
   project-level version control (the turn=commit model, ADR 0009). **Workspace = the shelf** — a flat
   collection of the kid's projects. No "multi-app project" concept; related apps are just separate
   projects (grouping/tags deferred until a real need appears).
2. **New app = a new project, kid-driven (now).** A kid-facing **shelf** ("My Apps") lists their
   projects, switches between them, and a "+ New app" creates a fresh empty project and switches to it.
   The agent builds within the **active** project (the route's files-exist guard already keeps it
   editing-in-place vs. scaffolding correctly). The agent **names** the app on first build
   (`create_project → projects.setName`). Agent-*assisted* "this is a new idea — start a new app?"
   detection is a **follow-up**, not v0.
3. **Staged bridge (don't leap):**
   - **(this step)** project = app + shelf — no data-model change.
   - genuinely **multi-file / subfolders** authoring (flip persona/templates; `compose()` already
     previews multi-file vanilla; a small file-tree in the kid UI).
   - **React via Sandpack** — the bridge to real apps. **De-risk the keystone first** (can the agent
     produce a multi-file React app that renders reliably + safely in Sandpack under the kid-safe
     constraints?).
   - **persisted project-level commits** (#33) — the real git object store — once multi-file makes
     per-turn cross-file commits genuinely valuable; then "clone to a real git repo" (#34) earns its keep.
4. **Respect the constrained-generation wedge.** Per the constrained-generation wedge (`CONTEXT.md`; the economics note is archived, not included),
   unconstrained "real React" pushes cost/reliability/safety the wrong way. The bridge stays **gradual**
   (multi-file *structured* → *constrained* React → wider), keeping the wedge intact.

## Why

- Makes "project = app" *true*, matching the schema's stated intent, the git mental model the owner
  already uses, and ROADMAP M5's shelf.
- Makes the ADR-0009 turn-commit timeline **coherent** — each project's history is one app's git log,
  and a single turn naturally spans the multiple files it touched.
- It's **cheap now** (the substrate exists) and is the only credible path off single-file toward real
  apps — the explicit goal.

## Roads not taken

| Option | Why not |
|---|---|
| Keep one project = many apps (status quo) | The conflation that caused the mess; breaks project = app and muddies the timeline. |
| Model "a project that contains multiple apps" | Re-introduces the conflation. Keep project = app atomic; workspace groups. Add tags later only if needed. |
| Agent auto-creates a new project on a "new idea" | Needs agent judgment (risk of wrongly splitting/merging). Start kid-driven (explicit shelf); add agent-assist later. |
| Jump straight to unconstrained real React | Blows up the constrained-generation wedge (cost/reliability/safety). Bridge gradually via Sandpack. |

## Consequences / limitations

- **Within-app vs new-app is kid-driven for now.** If a kid asks for something unrelated *without*
  tapping "+ New app", the agent still builds it into the current app. Acceptable for v0; agent-assisted
  new-app suggestion is the refinement.
- **React is the real bet**, gated behind its own keystone (Sandpack under kid-safe constraints) — not
  assumed by this ADR.
- More files / more freedom raises the agent's iteration-loop cost + safety surface — manage via the
  constrained-generation posture, not by abandoning multi-file.
- No data-model change for this step; folders ride `files.path`. Persisted commits (#33) stay deferred.

## Status & revisit-trigger

**Accepted (v0) — [USER CALL].** Revisit when: the React/Sandpack keystone is proven (then commit to the
bridge), or scale makes persisted commits (#33) pay off, or a real need for project *grouping* appears.
