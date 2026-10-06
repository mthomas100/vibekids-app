# ADR 0002 — Backend: Convex as the single store + realtime transport

> Index: `docs/decisions/LOG.md` (D5, folds in D10). Status: **Locked.**

## Context

The defining UX requirement is **"watch it build live"** — chat *and* the code preview must update in
realtime as the agent works. We needed a data layer that makes realtime the default and is pleasant for
an LLM-first codebase to operate. The temptation is to treat chat and preview as two systems (a chat
socket + a separate preview-refresh mechanism); collapsing them is the architecture's biggest simplifier.

## Options considered

1. **Convex.** Every query is a *live subscription* by default; reactive end-to-end; strong LLM-first DX
   (a rules file, an MCP server, `ai-files install`). One system for data *and* realtime transport.
2. **Supabase (Postgres + Realtime).** Mature SQL + auth + realtime, but realtime is a bolt-on channel
   you wire up explicitly; more moving parts to keep chat and preview in sync.
3. **Next.js + Postgres (Neon).** Maximum control and familiarity, but you hand-roll *all* realtime
   (websockets/polling) yourself — exactly the plumbing we want to not own.

## Decision

**Convex** as the single store **and** the single realtime transport (folding in D10: **one transport
for both chat and preview**). Tool handlers write to `messages`/`suggestions`/`buildStatus`/`files`; the
client subscribes once via `useQuery`; **the preview re-renders reactively from the `files` table** — no
manual refresh logic, no hand-rolled websockets/polling. Codified as a guiding principle in `ROADMAP.md`
("One realtime transport (Convex) … fewer moving parts"). The schema is deliberately slim
(`projects · files · messages · suggestions · buildStatus`); accounts/profiles/snapshots return with
auth in Phase 1+, still on Convex.

## Why

Convex collapses "data layer" and "realtime transport" into one system, so **"watch it build" needs zero
socket code** — the single biggest simplifier in the architecture. The two surfaces (chat + preview)
**can't drift out of sync** because they read the same source of truth, and there's exactly one place to
reason about realtime. Two transports would double the failure modes and the sync logic for no benefit —
this is the practical payoff that makes Convex the right call, and *why* it won over Supabase/Postgres
(both of which make us own realtime wiring Convex gives us for free). It's also the most LLM-first
backend of the three (rules file + MCP + `ai-files install`), which matters for an agent-built codebase.

## Status & revisit-trigger

**Locked.** Reopen only on a hard need Convex can't serve well — **heavy relational/analytical
workloads**, a **self-hosting mandate**, or a **scale/cost wall**. Even then, prefer keeping Convex as the
spine before introducing a second transport.
