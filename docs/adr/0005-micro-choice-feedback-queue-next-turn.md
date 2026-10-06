# ADR 0005 — Micro-choice feedback model: queue / next-turn (not live injection)

> Index: `docs/decisions/LOG.md` (D13). Status: **Locked (v0) [USER CALL].**
> Evidence: `docs/research/micro-choice-feedback-model.md`.

## Context

The signature "latency is a feature" mechanic: while Sparky builds, it asks the kid a quick build choice
(`start_micro_choice` → a question + 2–4 tappable chips). The open question is what happens when the kid
*acts on that choice while a build is still running*. Today a build is one atomic, blocking agent turn
(`/api/chat` runs `query()` to completion); the chip already renders mid-build (Convex is reactive), but
the UI's `busy` guard makes a mid-build tap a **no-op**, and each turn is a fresh, stateless `query()` with
**no file context** and no `read_file` tool.

## Options considered

1. **Live in-flight injection (A).** Push the tap into the *running* turn via the Agent SDK's
   streaming-input mode (`AsyncIterable` prompt + `interrupt()`). Most "magical."
2. **Queue / next-turn (B).** Show the choice during the build (non-blocking — Sparky picks a sensible
   default and keeps going), queue the tap, apply it as the *next* turn that tweaks the result.
3. **Ask-before (blocking).** Sparky asks the choice first, then builds with it (the "design guidance"
   flavor seen in Lovable/v0/Bolt/Replit plan modes).

## Decision

**Option B — queue / next-turn.** The micro-choice fills the wait but never blocks it; the kid's tap is
applied as the next turn. **[USER CALL, 2026-05-30.]**

## Why

- **The whole category independently converged on B.** Lovable, Replit, and v0 all *queue* mid-build input
  and run it after the current build; Bolt blocks it; none inject mid-stream. Cursor *tried* mid-run
  steering and moved its **default away** from it because interrupting mid-tool "produces degraded output."
  (See the research doc for sources.)
- **A is against the grain and risky.** It needs cross-request shared state to route a tap into an active
  `query()`, bets on streaming-input working on the subscription/OAuth path, and only helps in the narrow
  window where a build is *still running* when the kid taps. Highest cost, least proven, worst-supported.
- **B is cheapest and most reversible** — it reuses the existing chip→send path; the work is a small
  continuity fix plus UI plumbing (unblock the `busy` guard so a tap queues).
- **Non-blocking matters for kids:** an 8–12-yr-old may just watch. A build that *stalls* waiting for a tap
  (option 3) is fragile; B degrades gracefully to "Sparky just builds it with a sensible default."

## Consequences

- **Continuity is a hard prerequisite** (carved out as its own issue): a follow-up turn must receive the
  current project files and be told to **edit** them, never `create_project` again. This also repairs the
  already-shipped `suggest_idea` chips, which share the gap. Prove it before building the UI on top
  (de-risk-the-keystone-first).
- Microchoice chips should read as **a question being answered**, visually distinct from "next idea" chips.
- The `busy` guard must let a mid-build tap **queue** (and show as picked) rather than no-op.

## Status & revisit-trigger

**Locked for v0.** Revisit Option A only if (a) builds become long enough that next-turn latency visibly
hurts the "while-you-wait" feel, AND (b) we're on the production (API) engine where streaming-input steering
is cheap and proven — never on the subscription path.
