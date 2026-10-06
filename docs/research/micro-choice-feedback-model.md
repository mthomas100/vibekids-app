# Research — Micro-choice feedback model: how AI builders handle mid-build input

> Feeds **ADR 0005** (LOG D13). Question: when a kid taps a micro-choice (or types) **while Sparky is
> still building**, what happens to that input? Surveyed the 4 comparables named in `CONTEXT.md`
> (Lovable / Replit / v0 / Bolt) plus the closest technical analog (Claude Code / Cursor / Windsurf).
> 5 parallel sub-agents, web sources current to **May 2026**.

## The category, side by side

| Product | Mid-build input | Interrupt | Creative "pick something" |
|---|---|---|---|
| **Lovable** | **Queue** → runs after the current task (visible queue, reorder/edit/remove; shipped Jan 2026) | Stop button, keeps partial work | "Design guidance": pick 1 of 3 directions — *before* the build |
| **Replit Agent** | **Queue** → runs after the current "work loop" (Message Queue, Jul 2025); context preserved across queued msgs | Pause bypasses queue; auto-checkpoints (git commits) + 1-click rollback | Plan Mode — *before* the build |
| **v0 (Vercel)** | **Queue** up to 10 → runs after; reorder/edit/remove | Stop (server finishes anyway; no cancel API) | Clarifying Qs + Plan Mode — *before* |
| **Bolt.new** | **Blocked** — send disabled while `isLoading` | Stop + `abortAllActions`; partial files remain | Plan / Discussion mode — *before* |
| **Cursor** | **Queue / steer at next tool-call boundary** (default since v1.4); Cmd+Enter = hard interrupt | Ctrl+C; checkpoint rollback | — |
| **Claude Code** | Esc = interrupt-then-redirect (streaming-input SDK + `interrupt()`); **no queue mode** | Esc / Ctrl+C, keeps work so far | — |

## Three findings

1. **Nobody does live mid-stream injection (our rejected Option A).** 4/4 dedicated builders queue the next
   instruction and run it *after* the current build; Bolt just blocks input. The one tool that tried
   steering mid-run — Cursor — moved its **default away** from hard mid-tool interruption because it
   "produces degraded output since the agent didn't get what it expected" (Cursor v1.4 rationale, Aug 2025).
   Even Claude Code, which *has* the streaming-input machinery, uses it for interrupt-then-**redirect**, not
   "fold a new instruction into the running turn."
2. **The "pick something" interaction is real — but it lives BEFORE (or after) a build, never injected into
   one.** Lovable design directions, v0 clarifying questions, Replit/Bolt plan modes.
3. **Every builder has the thing v0 is missing: cross-turn continuity** — checkpoints / version history /
   "context preserved across queued messages." Without it, a queued follow-up can't know the current
   project state. This is the table-stakes foundation the queue pattern sits on.

## What it means for VibeKids

- **Adopt the category-standard queue / next-turn model** (→ ADR 0005 = Option B). The micro-choice is
  shown *during* the build to fill the wait, but **non-blocking** (Sparky picks a sensible default and keeps
  going — never stalls), and the tap is applied as the **next turn**. This is Lovable/Replit/v0's model
  adapted to Sparky's "ask a fun question" framing.
- **Continuity is the prerequisite, not scope-creep.** A follow-up turn must receive the current files and
  *edit* them (never `create_project` again). This also repairs the already-shipped `suggest_idea` chips,
  which share the gap.
- **Reject live in-flight injection (Option A)** — against the grain of the whole category, degrades output,
  and needs cross-request shared state + an unproven subscription-path bet.

## Sources (web, current to May 2026)

- **Lovable** — `docs.lovable.dev/features/agent-mode` (queue + stop button); `lovable.dev/blog` "Build more.
  Manage less." (Jan 28 2026, prompt queue); `docs.lovable.dev/features/design-guidance`.
- **Replit** — `docs.replit.com/core-concepts/agent/message-queue`; `replit.com/blog/introducing-queue`
  (Jul 22 2025); `blog.replit.com/inside-replits-snapshot-engine` (Dec 2025, checkpoints);
  `docs.replit.com/core-concepts/agent/checkpoints-and-rollbacks`.
- **v0** — `v0.app/docs/text-prompting` (queue up to 10, runs after); `v0.app/changelog` (clarifying
  questions Dec 17 2025; "blocked sending when pending edits" Jan 12 2026);
  `community.vercel.com` (no server-side cancel API; Plan Mode).
- **Bolt** — `github.com/stackblitz/bolt.new` (`isLoading` send-guard; PR #11139 `abortAllActions`, Nov 2025);
  `support.bolt.new/best-practices/discussion-mode` (Plan/Discussion = pre-build).
- **Cursor** — `cursor.com/changelog/1-4` (Aug 2025, "Send" vs "Stop & send"); Cursor forum (PM rationale:
  mid-tool interrupts degrade output).
- **Claude Code / Agent SDK** — `code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode` (streaming-input
  mode + `interrupt()`); `code.claude.com/docs/en/interactive-mode` (Esc = interrupt-then-redirect).
- **Cross-tool signal** — VS Code issue #288920 "Live Steering" (Jan 2026): users *want* between-tool-call
  steering; tooling doesn't yet do it well → confirms it's an unsolved frontier, not a safe v0 bet.
