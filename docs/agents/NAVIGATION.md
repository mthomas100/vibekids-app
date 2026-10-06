# Navigation — the repo map

> Pure router: where things live, not what they say. (Only goes stale on file *locations*.)
> Eager-loaded from `CLAUDE.md`. For facts, follow the links.

## Read these to orient

| File | What it gives you |
|---|---|
| `CONTEXT.md` | Why VibeKids exists + the domain glossary (read first) |
| `docs/decisions/LOG.md` | Every settled decision (D1–D26) + hard-won learnings (L1–L14) |
| `ROADMAP.md` | The phased plan (slow-moving) |
| `docs/operating-philosophy.md` | How a VibeKids agent works (the two postures) |

## Working on X → read Y

| You're touching… | Read |
|---|---|
| agent loop / tools | `lib/ai/` + `docs/adr/0001-agent-sdk-on-max-subscription.md` |
| backend / realtime | `convex/` + `docs/adr/0002-convex-as-realtime-store.md` |
| preview / sandbox | `components/PreviewPane.tsx` + `docs/adr/0003-iframe-srcdoc-sandpack-preview.md` |
| billing / auth | `CLAUDE.md` "LLM credentials" + `docs/adr/0001-agent-sdk-on-max-subscription.md` + `lib/ai/env-guard.ts` |
| a past decision | `docs/decisions/LOG.md` + `docs/adr/` |

## Where things get written

| When you… | Write to |
|---|---|
| make a decision | `docs/decisions/LOG.md` (+ a numbered ADR in `docs/adr/` if architectural) |
| advance the work | the `ROADMAP.md` checkboxes (+ a local `docs/PROGRESS.md` handoff ledger, not part of this export) |
| produce research | `docs/research/` (+ a one-liner in `docs/research/INDEX.md`) |
| run `/retro` | a blameless AAR in `docs/decisions/retros/` (retros are kept out of this export) |
