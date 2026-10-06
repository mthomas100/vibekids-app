# VibeKids — CLAUDE.md

VibeKids is a web app where kids (8–12) "vibe code" their own apps by chatting with a friendly
avatar ("Sparky") that builds for them, with a live preview beside the chat. Under the hood it is
**a coding agent for children**.

- **Start here — repo map & where everything lives:** @docs/agents/NAVIGATION.md
- **Vision & domain glossary:** CONTEXT.md
- **Where we are right now:** `ROADMAP.md` status + `docs/decisions/LOG.md`
- **How a VibeKids agent works:** docs/operating-philosophy.md
- **Roadmap & milestones:** `ROADMAP.md`

## LLM credentials

- `LLM_PROVIDER=api` (the default) → the Agent SDK authenticates with `ANTHROPIC_API_KEY`
  (Bedrock / Vertex also work through the SDK's own env vars).
- `LLM_PROVIDER=subscription` is an **opt-in for personal local experiments only**: it uses your own
  `CLAUDE_CODE_OAUTH_TOKEN`. Never use it for anything other people use. See Anthropic's
  [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview) on authentication.
- `lib/ai/env-guard.ts` (`assertLlmAuth()`) fails fast when the selected provider has no credential;
  call it at the top of every route that runs `query()`.
- Always select models via `modelForRole()` in `lib/ai/provider.ts`; **never hardcode model ids.**
- `npm run smoke-test` makes one tiny `query()` with a custom tool to check your credential works.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind v4. ⚠️ See "Framework rules" — Next 16 differs
  from training data.
- **Convex** — realtime store. Every query is a live subscription (powers chat AND live preview).
  Never hand-roll websockets/polling.
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) — the agent loop; custom tools via
  `tool()` + `createSdkMcpServer()`.
- **Preview** — sandboxed `<iframe srcdoc>` (HTML/CSS/JS); Sandpack (React) is planned.

### Framework rules (Next.js 16)
@AGENTS.md

## Repo map

| Path | What |
|---|---|
| `app/` | Next.js routes + UI (the split-screen lives here) |
| `app/api/chat/` | Node-runtime route that runs the Agent SDK loop |
| `lib/ai/provider.ts` | `modelForRole()` + `LLM_PROVIDER` switch — the only place model ids live |
| `lib/ai/env-guard.ts` | `assertLlmAuth()`: fail fast when the selected provider has no credential |
| `lib/ai/tools.ts` | the agent's custom tools (write_file, edit_file, run_preview, …) |
| `lib/ai/persona.ts` | Sparky's kid-safe system prompt |
| `convex/` | schema + queries/mutations (files, messages, suggestions, buildStatus) |
| `components/` | React UI (SplitScreen, AvatarChat, SuggestionChips, PreviewPane) |
| `scripts/agent-smoke-test.mjs` | one-call check that the Agent SDK + a custom tool work with your credential |
| `docs/research/` | design research (see `docs/research/INDEX.md`) |

## Conventions

- **Agent tools**: define in-process with `tool(name, desc, zodShape, handler)`; handlers persist to
  Convex (don't touch the filesystem directly). Descriptions are short, imperative, with a one-line
  "use when…". Drop built-ins (`tools: []`) so the model uses only ours.
- **Realtime**: read state with Convex `useQuery`, write via mutations. The preview re-renders
  reactively from the `files` table — no manual refresh logic.
- **Models**: `modelForRole("fast"|"balanced"|"deep")` = Haiku/Sonnet/Opus. `fast` for chat/chips,
  `balanced` for codegen, `deep` only for hard scaffolds (it costs the most).
- **Kid-safety**: constrained generation (safe templates); never surface raw errors/stack traces —
  friendly messages only; moderate model text out. Sparky is a *building helper*, never an
  open-ended companion.
- **TypeScript**: strict; avoid `any` in app code. Validate tool inputs with zod.

## Commands

- `npm run dev` — Next.js dev server
- `npm run dev:backend` — `convex dev` (regenerates `convex/_generated` types; keep it running)
- `npm run smoke-test` (or `-- <model>`) — one small Agent SDK call with a custom tool
- First-time backend: `npx convex dev` (creates the Convex project; interactive login)

## v0 scope guardrails (don't build these unprompted)

Deferred to later phases: **auth / Clerk / COPPA**, **voice (STT/TTS)**, **cloud sandboxes
(E2B/Modal)**, **full output moderation**, classroom/sharing. v0 = no auth, anonymous local
workspace, a tight proof-of-concept.

## Git & tooling

- Atomic commits, conventional-commit subjects, work on branch `v0`. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Convex MCP** is wired (`.mcp.json`) — use it to introspect tables, run functions, and verify
  work live (loads after a Claude Code session restart).

## Human-in-the-loop — stop and ask, don't hack around

You operate with high autonomy on **reversible** work: research, code, refactors, atomic
commits, throwaway prototypes — just do it. But some actions are **human-only**. When you
hit one, STOP and use `/request-human` (or just say so plainly). Do **not** fake, script
around, or grind on it. Asking is a first-class move, not a failure.

**Always stop for:**
- **Account / identity creation** — signing up for a service, creating a Convex/GitHub/
  Clerk/cloud project, anything needing a real human + email + ToS acceptance.
- **Interactive OAuth / browser login** — `claude setup-token`, `npx convex dev` first run,
  `gh auth login`, any flow that opens a browser for the human to authenticate.
- **Restarting the session / reloading the harness** — loading a freshly-installed MCP
  server, applying new hooks, anything that needs Claude Code itself to restart. You cannot
  restart yourself; ask, then continue once the human confirms.
- **A genuine product / architecture decision** — a real fork in the road with no obviously
  reversible default (the v0 engine choice was one of these). Lay out the options + your
  recommendation and let the owner pick. (Reversible? Just decide and note it in a decision log.)
- **Anything that spends real money** — e.g. switching to a bigger model tier or running long
  unattended builds; credentials are the human's to set, never the agent's.

**When you stop, hand over a clean baton** (this is what makes HITL cheap):
1. One sentence on *what* you need and *why* you can't do it.
2. The exact command(s) for the human to run, copy-pasteable.
3. What to paste back / confirm so you can resume immediately.
Then keep going on anything *else* that is unblocked while you wait — don't idle.

## Capture emergent work — don't lose it, don't chase it

While building, you'll notice work that's **real but out of the current scope**: a bug, a needed
refactor, a deferred decision, an unhandled edge case, a good idea. **File it as a one-line
`needs-triage` issue and keep going** — don't lose it (the context window will), and don't *chase* it
(that derails the session):
```bash
gh issue create -t "<one-liner>" -b "<what + why + rough scope>" -l needs-triage
```
The bar: *would a future session need this and not rediscover it from the code/roadmap?* If yes → file.
**Bias to capture** — triage cleans up, so a junk issue is cheap; a lost one isn't. (When *you* want a
thought routed to its proper home — issue / ADR / CONTEXT / ROADMAP — use `/capture`.)

## Agent skills

Per-repo config for Matt Pocock's engineering skills (`to-issues`, `to-prd`, `triage`,
`diagnose`, `tdd`, `improve-codebase-architecture`, `zoom-out`).

### Issue tracker

This repo's GitHub Issues, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map 1:1 to label names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by
`grill-with-docs`). See `docs/agents/domain.md`.
