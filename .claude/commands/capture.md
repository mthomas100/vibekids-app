---
description: >
  Capture a rough thought and land it in the right place. You express something half-formed; this
  grills you (lightly) to sharpen what you really want, then routes it to its proper home — a GitHub
  issue, an ADR, a CONTEXT.md glossary entry, or a ROADMAP line — and files it.
argument-hint: "[the thing to capture — a thought, bug, idea, or decision]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Grep, Glob
---

# /capture — toss it in, land it in the right place

Take the user's rough expression (`$ARGUMENTS`, or what they just said) and turn it into something that
lands where it belongs — **sharpened, not dumped.** Scale the grill to the ambiguity: a clear, small
capture gets filed in seconds; a fuzzy one gets a short interview first.

## 1. Listen & classify
Read the input. Name what it actually *is* — that decides the home:
bug · feature/want · refactor · **architectural decision** · term/concept · **new area/epic** · idea · question.
If it's obviously trivial and unambiguous, skip the grill and go straight to routing.

## 2. Grill — what do you *really* want? (scaled)
**Use the `grill-with-docs` skill**, pointed at the thought. The job:
- Separate the **surface request from the real need** ("the preview feels slow" might really be "there's
  no loading feedback").
- Pin **scope** (how big) and **when** (now vs later).
- Check it against `CONTEXT.md`'s glossary + `docs/adr/` — does it touch a decision we've already made?

Light for a clear item (one question); deep for a fuzzy goal/epic. Don't interrogate a one-liner.

## 3. Route to the right home
| What it is | Home |
|---|---|
| work unit (bug / feature / refactor / chore) | a **GitHub issue** — `gh issue create -t "..." -b "..." -l needs-triage` (use `ready-for-agent` only if the grill made it fully specified) |
| an architectural decision ("do it *this* way") | an **ADR** in `docs/adr/` + a line in `docs/decisions/LOG.md` |
| a term / concept | a **`CONTEXT.md`** glossary entry |
| a whole new feature area / phase | a **`ROADMAP.md`** entry (+ an epic issue; if it splits into slices, use the `to-issues` skill) |
| a vague "someday/maybe" | a low-priority **`needs-triage`** issue |

When in doubt between homes → a `needs-triage` issue. Bias to capture; triage decides later.

## 4. File + confirm
Create the artifact, then emit one line:
> ✅ **Captured →** `<home>` — #NN / ADR 000N / CONTEXT.md / ROADMAP.md

## Anti-patterns
- Don't dump it verbatim without clarifying — a vague issue is noise the next agent can't act on.
- Don't grill a trivial capture — file it and move on.
- Match the home — don't file a decision as an issue or a term as a ROADMAP line.
- Don't *do* the work now — `/capture` files; building happens via `/kickoff`.
