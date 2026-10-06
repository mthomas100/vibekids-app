---
name: request-human
description: >
  Use when you hit a human-only action — account/project creation, interactive OAuth or
  browser login (claude setup-token, npx convex dev, gh auth login), restarting Claude Code
  to load a freshly-installed MCP or new hooks, a genuine product/architecture decision, or
  anything that spends real money or changes credentials/billing. STOP and
  hand the human a clean baton instead of hacking a workaround or grinding a dead path.
user-invocable: true
allowed-tools: Read, Bash
---

# Request Human

You've hit something only the human can do. Stopping here is correct. The goal of
this skill is to make the handoff *fast* — a 30-second unblock, not a back-and-forth.

## First: are you sure this is human-only?

Re-check. Many "I'm blocked" moments are actually "I haven't tried the reversible path."
- Is there a non-interactive flag, a token already in the env, or a fixture you can use?
- Could a sub-agent or a different tool clear it?
- Is the "decision" actually reversible (then just decide and log it in `docs/decisions/LOG.md`)?
If any of these is yes — do that instead. Only escalate genuine human-only actions.

## The four legitimate triggers

1. **Identity / account / project creation** (needs a human + email + ToS).
2. **Interactive login** that opens a browser (`claude setup-token`, `npx convex dev` first
   run, `gh auth login`, `/login`, Clerk dashboard).
3. **Harness restart / reload** — a new MCP server, new hooks, anything needing Claude Code
   itself to restart. You cannot restart yourself.
4. **A genuine, irreversible product/architecture decision** — a real fork with no safe default.

## Hand over a clean baton

Emit a short, scannable block — nothing else in the message competes with it:

> **🙋 Need you for ~30s.**
> **What:** <one line — what you need>
> **Why I can't:** <one line — interactive login / account / restart / your call>
> **Run this:**
> ```bash
> <exact copy-pasteable command(s)>
> ```
> **Then:** <what to paste back / confirm so I resume — e.g. "paste the deployment URL" /
> "say 'restarted' once Claude Code is back" / "tell me A or B">
> **Meanwhile I'll:** <the unblocked work you'll do while waiting — or "I'm blocked on this">

## After the human responds

Resume immediately from the baton; don't re-derive context. If this was a decision, append a
line to `docs/decisions/LOG.md` (date, decision, chosen option, alternatives, why) — and if
it's architectural, drop a numbered ADR in `docs/adr/` — so it never has to be re-litigated.

## Gotchas (grow this list)
- Don't pre-emptively escalate to look careful — escalating a reversible action is its own
  anti-pattern (it burns a human turn). The bar is *genuinely* human-only.
- `npx convex dev` is interactive only on first project setup; the daily `convex dev` is not.
- After a human installs an MCP, it loads on the **next** session — you must ask for a
  restart, then re-orient; you cannot see the new tools in the current session.
