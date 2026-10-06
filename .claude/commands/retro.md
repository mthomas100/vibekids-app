---
description: >
  After a good session, synthesize a blameless retro + a menu of rolled-forward improvements
  (new skills, CLAUDE.md / ROADMAP / decision-log edits). Writes the durable AAR immediately;
  only PROPOSES structural changes for human approval. Modelled on a blameless after-action review.
argument-hint: "[optional: what this session was about]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Grep, Glob
---

# /retro — make the next agent better

Run this at the end of a session that went well (or instructively badly). Two outputs:
a durable AAR you write now, and a menu of improvements you only PROPOSE. Time-box ~10 min.

## 1. Gather the evidence (don't rely on memory — memory keeps outcomes, loses decisions)
- `git log --oneline -30` and `git diff --stat` since the session start / last retro.
- Skim this conversation for: decisions made, alternatives weighed, dead ends, friction,
  patterns you repeated, moments a human had to unblock you.
- Read the tail of `docs/decisions/LOG.md`, the recent `docs/adr/`, and `ROADMAP.md` so
  proposals don't duplicate.

## 2. Write the AAR now (Tier A — durable, append-only)
Append to `docs/decisions/retros/<YYYY-MM-DD>-<slug>.md` (create dir if needed). Headings
(Google-SRE blameless template, trimmed — keep each to ≤5 bullets):
1. **Summary** (3 lines): what shipped, headline outcome.
2. **What went well** — patterns to *protect*.
3. **What went wrong** — process/tooling only, never blame.
4. **Where we got lucky** — fragile wins; this field surfaces hidden risk.
5. **Decisions made** — each as: decision · chosen option · alternatives · why. Append a line
   to `docs/decisions/LOG.md` for each; promote architectural ones to a numbered ADR in
   `docs/adr/`.
6. **Action items** — owner + a one-line "is-this-fixed?" test each. No action = delete the bullet.

Also: refresh `docs/PROGRESS.md` (Now / Next / Watch-outs).

Then run the **doc-sync guard** (D22) so the human-authored views don't drift from reality:
`npm run check:docs` — close any issue it flags as DONE-but-open, and index any new research
doc / ADR it names. **End clean: zero hard failures.**

## 3. Distill improvement candidates (Tier B — PROPOSE only)
For each candidate, you MUST state the gate verdict before proposing it:

**New skill?** Apply the XKCD-1205 / ≥3× reuse test:
- Would this trigger ≥3 times across future sessions (here or other projects)?
- Is it knowledge/procedure that pushes the model OFF its default behavior?
- If done once → it's a decision-log line, NOT a skill. Say "later" or "no", with the reason.
- If yes → draft `name` + `description` (trigger form: "Use when…") + 3-bullet body sketch,
  and say whether it belongs **in-repo** (vibekids-specific) or **global** (cross-project).

**CLAUDE.md / AGENTS.md edit?** Only if a real gotcha bit you this session (a wrong default,
a footgun). Draft the exact diff. Don't add aspirational prose.

**ROADMAP / decision-log edit?** Did scope, milestone status, or a key decision change?
Draft the change.

**New rule or hook?** Only for a *mechanical, repeatable* hazard. Otherwise it's a CLAUDE.md
line. Justify why it must be enforced vs merely stated.

## 4. Present the menu and STOP
Output a numbered list: `[A]` items (already written) + `[B]` items (proposed, with gate
verdict + reuse argument). Ask the human which `[B]` items to apply. **Apply nothing in Tier B
without explicit go-ahead.** Then, on approval, make each as its own atomic commit.

## Anti-patterns
- Rumination ≠ reflection: ask "what ONE change?", don't replay the whole session.
- One strong action beats ten that don't land. Cap Tier-B proposals at ~5.
- Don't propose a skill to look productive. The ≥3× gate is the whole point.
- Don't optimize the persona/prompt before the runtime works (premature optimization).
