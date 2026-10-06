# VibeKids — Context

> The one-screen "why it exists + what the words mean." Read this first.
> The plan lives in `ROADMAP.md`; the decisions in `docs/decisions/LOG.md` → `docs/adr/`;
> how an agent works in `docs/operating-philosophy.md`. This is the grill-with-docs glossary
> contract that `docs/agents/domain.md` points at.

## North star

A 9-year-old with no coding experience makes something they're proud of in **under 5 minutes**,
laughs at least once, and immediately wants to make another. Say it → watch it build → play it.

## The unowned wedge

VibeKids is **a coding agent for children**: a kid (8–12) describes an idea in plain words (or taps a
suggestion), a friendly avatar — **Sparky** — *builds it for them* with AI, and a **live preview**
appears beside the chat. The bet is the intersection nobody owns: a **kid-safe conversational builder**
+ **AI that does the work** (kid stays "creative director") + **short-attention-span mechanics** (things
to try while it builds) + **child-safety guardrails on AI output**. Adult vibe-code tools (Lovable,
Replit, Bolt, v0) nail the magic but were never designed for kids — no reading level, no voice, no
attention scaffolding, no safety gate. That gap is the wedge.

## Operating philosophy (3 bullets — full version in `docs/operating-philosophy.md`)

- **One sentence:** be a high-autonomy frontier engineer on reversible, sandboxed work — and a
  disciplined junior who stops and asks the instant the work becomes irreversible, account-bound, or a
  genuine judgment call; throw compute at understanding, spend the human's attention only where it's the
  scarce resource.
- **Posture A — autonomous (~90%):** reversible + sandboxed work (code, refactors, atomic commits,
  research, prototypes) → just do it. Git is the undo button; the sandbox is the blast shield.
- **Posture B — stop and ask:** the moment the next step is irreversible, outside the sandbox,
  account/identity-bound, spends real money, or is a genuine fork → stop, lay out options + a
  recommendation, hand a clean baton. (Decide ties by **blast radius**.)

## Domain glossary

Use these exact terms in issues, ADRs, hypotheses, and test names. Don't drift to synonyms.

- **Sparky** — the kid-facing avatar/agent that does the building. A *building helper*, never an
  open-ended companion. Speaks at a 2nd–4th-grade reading level, one idea per chat bubble.
- **vibe-code** — the core loop: the kid describes an idea in plain language and the AI builds it, kid
  staying in "creative director" mode (after Lovable/Replit "vibe coding", redesigned for children).
- **micro-choice / suggestion-chip** — the "latency is a feature" mechanic: every wait is filled with a
  small choice that *feeds the build* (pick the color/sound/name). Rendered as 2–4 always-present tappable
  **suggestion chips** so a kid never faces a blank prompt. Backed by the `suggest_idea` /
  `start_micro_choice` tools. **"Feeds the build" = feeds the *next turn*, non-blocking** (queue model, ADR
  0005): Sparky shows the choice mid-build but never waits on it — it builds with a sensible default, and
  the kid's tap is applied as the following turn. (The choice is *never* injected into the running turn.)
- **Dream-It-Up mode** — the summoned pre-build interview (D26): a kid who doesn't know what to prompt
  taps the 🤔💭 door and Sparky asks up to **5** quick questions, one at a time — each with 3–4 tappable
  answers, ✏️ type-your-own, 🎲 surprise-me — then recaps the plan (⭐ card) and builds it once. The
  answers become the **brief** (the `briefs` table) compiled into the build turn's prompt. Opt-in and
  escapable everywhere (🚀 "I'm done — build it!" skips the recap gate); build-by-default stays the happy
  path. Questions run on the **fast** role; the opener/change/build-now beats are deterministic (zero
  model latency).
- **preview — Tier A** — sandboxed `<iframe srcdoc>` (HTML/CSS/JS), the default. Runs on the kid's own
  device, $0 execution. `sandbox="allow-scripts allow-modals"` **without** `allow-same-origin` (opaque origin, no
  cookies/parent access). Covers ~95% of kid apps.
- **preview — Tier B** — `@codesandbox/sandpack-react` for React / multi-file apps, alongside Tier A.
- **model roles (`fast` / `balanced` / `deep`)** — task-routed via `modelForRole()` in
  `lib/ai/provider.ts` (the only place model ids live): **fast = Haiku** (chat/chips + output-safety
  pass), **balanced = Sonnet** (default codegen), **deep = Opus** (hard scaffolds only — drains the
  metered sub credit fastest, use sparingly).
- **workspace** — v0 has no auth: an anonymous local workspace keyed by a `workspaceId` in
  `localStorage`. (Phase 1 adds Clerk where only adults log in and kids are *profiles*.)
- **buildStatus** — the live ticker showing what Sparky is doing now, in kid-framed present-continuous
  phrases ("Painting the buttons…", "Teaching it to count…"). Modeled on Claude Code's dual-form
  `content`/`activeForm` task items.
- **the 7 tools** — the agent's entire (sandboxed) action space; built-ins dropped (`tools: []`), no
  Bash/filesystem/network. Handlers persist to **Convex**, never the filesystem:
  `create_project`, `write_file`, `edit_file`, `run_preview`, `suggest_idea`, `start_micro_choice`,
  `offer_new_app` (the 7th, added later for the one-tap "start as a new app" chip). Dream-It-Up's interviewer has its own two:
  `ask_question`, `finish_interview`.
