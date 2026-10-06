---
description: >
  Start a focused, aligned session: orient (NAVIGATION → PROGRESS → CONTEXT), pick the next unit
  (the lowest-numbered ready-for-agent issue, or a goal you name), lock scope + architectural
  decisions via a scoped grill, de-risk the keystone, then emit a session brief. The session-start
  bookend to /retro.
argument-hint: "[optional: issue number or goal name]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Grep, Glob
---

# /kickoff — align, then build

The session-start ritual (the bookend to `/retro`). Goal: in a few minutes, get **genuinely aligned on
what this session will accomplish** — scope locked, the architectural decisions made *and written down*,
the keystone de-risked — before any building starts.

**Scale every step to the work.** A crisp `ready-for-agent` issue gets a 1-minute confirm; a fuzzy
goal/epic gets a real grill. Never ritualize a typo fix — for trivial work, orient, state the one-line
plan, and go.

## 1. Orient (always)

Read, in order:
- `docs/agents/NAVIGATION.md` — the repo map.
- `docs/PROGRESS.md` (if present — a local, uncommitted-in-this-export handoff ledger) — Now / Next / **Watch-outs**.
- `CONTEXT.md` — the vision + domain glossary (the language to use).

## 2. Pick the target

- If `$ARGUMENTS` names an issue number or a goal, use that.
- Otherwise, show the open **ready-for-agent** queue and default to the lowest-numbered (do them in order):
  ```bash
  gh issue list --state open --label ready-for-agent \
    --json number,title --jq 'sort_by(.number) | .[] | "#\(.number) \(.title)"'
  ```
  The first line is the default pick. If it's genuinely ambiguous (several plausible, or the user was
  vague), show the queue and ask which — or "something else." Don't guess on a real fork.
- Read the chosen unit in full: `gh issue view <n>` + any ADRs / docs it links.

## 3. Grill for alignment — scaled to ambiguity

**Use the `grill-with-docs` skill**, pointed at the chosen unit. The job:
- Lock **scope**: what's in, what's explicitly out, *for this session*.
- Surface the **architectural decisions** that must be made up front (the forks expensive to reverse
  later) — and resolve them *now*, with the user.
- Challenge the plan against `CONTEXT.md`'s glossary + the `docs/adr/` decisions; sharpen fuzzy terms.
- **Capture crystallized decisions inline** — update `CONTEXT.md` for terminology, add an ADR for a real
  architectural call (per `grill-with-docs`'s own discipline: ADRs sparingly, only hard-to-reverse calls).

Scale it: a well-specified issue → 1–2 confirming questions, then move on. A fuzzy goal/epic with real
forks → grill properly until the decision tree is resolved.

## 4. De-risk the keystone

If the locked plan rests on an **unproven assumption** (a new API/SDK behaving as hoped, a sandbox truly
isolating, a billing/deploy path working), **use the `de-risk-the-keystone-first` skill** — write the
smallest test that proves or kills it *before* building on top. If there's no load-bearing unknown, say so
and skip.

## 5. Emit the session brief

Output one tight block, then update state:

> **🎯 Session brief**
> **This session:** `<the concrete thing we'll build>`
> **Out of scope:** `<what we're explicitly NOT doing>`
> **Decisions locked:** `<key calls>` (→ ADR 000N if added)
> **Keystone:** `<proven / killed / none>`
> **Done when:** `<the issue's acceptance criteria>`

Then:
- Update `docs/PROGRESS.md` "Now" to the picked unit.
- Optionally mark the issue in-progress:
  `gh issue comment <n> --body "Picked up via /kickoff — <brief one-liner>"`.
- *(Doc-sync is a **guard, not a generator** — #14 resolved as **D22**: keep the PROGRESS edit by hand;
  run `npm run check:docs` to catch any ledger/issue drift before you hand off.)*

## 6. Go

Hand off to normal building — now aligned. The user can adjust the brief; otherwise, start.

## Anti-patterns

- Don't grill a trivial/typo task — orient, one-line plan, build.
- Don't hand-roll the grill or the de-risk — **compose** `grill-with-docs` + `de-risk-the-keystone-first`.
- Don't decide what's the user's to decide — surface the fork and let them choose.
- Don't skip writing a real decision down — an unrecorded decision gets relitigated next session.
