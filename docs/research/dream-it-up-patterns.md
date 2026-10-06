# Dream-It-Up patterns — clarify-before-build for kids (research brief)

> Distilled from a 6-agent research program (2026-07-08): 2025–26 product teardowns
> (Kiro, Replit Agent 3, Lovable, v0, Bolt, Cursor, Devin, Spec Kit, Gamma,
> Character.ai), LLM clarifying-question literature, and child–AI co-creation /
> dialogic-reading research. Shapes the Dream-It-Up mode (D26). The full research
> output is archived elsewhere; this page keeps only what we act on.

## The industry convergence (what everyone settled on)

- **Trigger = opt-in mode, never reflex.** A distinct plan/discussion mode you enter;
  models ask "only when they need to" (v0 changelog). Nobody clarifies on every prompt —
  and models don't volunteer questions unaided (ClarifyGPT: "recognize ambiguity but
  rarely ask") — an interview is an *engineered* flow, not an emergent one.
- **Budget = 2–5 questions, hard cap.** Kiro Quick Plan 2–4 · Cursor 3–5 · Spec Kit ≤5.
  Ungoverned "interview me" prompts blow past 40 (the horror story).
- **Format = options-first + free-text custom + skip.** v0 renders single/multi-select
  with inline custom answers; Claude Code's AskUserQuestion is 2–4 labeled options.
- **Artifact = an editable plan shown before building** (Cursor `.cursor/plans/`,
  Kiro specs, Gamma outline-first), gated by ONE explicit go ("Start building" /
  "implement the plan").
- **Top annoyances** (Cursor forums): asking after the user said go; re-confirm loops;
  no off-switch; questions the user can't answer; a modal that hijacks flow.

## Evidence with numbers

- **Clarify-then-generate beats one-shot**: ClarifyGPT lifts GPT-4 Pass@1 70.96%→80.80%
  (MBPP); LLM elicitation interviews reach ~74% requirement coverage, +10.2% completeness
  vs experts (arXiv 2310.10996, 2507.02564, 2501.19297).
- **Selective asking beats always/never**: +4–5% (ICLR'25, arXiv 2410.13788). Over-asking
  costs: ~34% fatigue quits; low-quality questions are *worse than none* (TOIS'22).
- **3–5 options outperform 2** (MIMICS studies, arXiv 2402.01934). Kids' screens: 3–5
  choices max (Hick's law + choice overload).
- **Dialogic questioning works on kids**: +0.60 SD comprehension; a conversational agent
  matched a human partner (Xu, Child Dev 2021). The engine is PEER's *Expand* step —
  recast the kid's answer and build on it. Open cues beat closed even at age 9–10
  (arXiv 2211.14228). Curious framing ≈ 2.4× more turns (CURIOBOT).
- **Kids bristle at quizzing** (Khanmigo reviews); they accept AI *refinements* of their
  idea but resist *substitutions* (CHI'26 "zone of independence"). Warmth must not do the
  thinking for them (arXiv 2505.01106 "illusion of understanding").
- **Kids 7–11 type poorly** — taps and voice carry the load; free text is the escape,
  not the default (StoryPrompt/StoryDrawer both shipped voice-or-text).
- **Moderate constraints raise originality** (U-curve, 145-study review) — option chips
  ARE the productive constraint. Blank-canvas freeze is the enemy (ChatScratch).
- Reading level: ~2nd–3rd grade, 6–8 word sentences; positive framing lifts completion
  (~55% vs 38%).

## How Dream-It-Up applies it (the mapping)

| Evidence | Shipped as |
|---|---|
| opt-in trigger, anti-Clippy | grape door on the empty canvas; build-by-default untouched |
| hard budget 2–5 | `MAX_QUESTIONS=5`, `MIN_QUESTIONS=2`, server-enforced via `allowedTools` |
| options-first + custom + skip | 3–4 chips + ✏️ Something else (input) + 🎲 Surprise me |
| one explicit go, never re-confirm | 🚀 "I'm done — build it!" always visible; explicit go skips the recap gate; `DONE_INTENT` regex |
| plan artifact + gate | recap bubble + ⭐ plan card ([🚀 Build it!] / [✏️ Change something]) |
| Expand/echo + affirm | `ask_question.reaction` echoes the kid's word; instant ack beat (L10) |
| refine-don't-replace, surprise slot | "Surprise me" → Sparky picks AND says what it picked |
| latency never blocks | deterministic opener/change/build-now (0 model calls); Haiku fast-role turns ~9s, covered by ack + dots; early-break at the tool call |

## Anti-patterns we explicitly avoid

Batched wall-of-questions · uncapped loops · bare open-ended questions · >5 chips ·
re-asking what a free-text answer already covered · asking anything after "build it" ·
interview-by-default on clear prompts (the door is summoned).

## Sources (primary)

Spec Kit /clarify · v0 changelog (Dec'25/Jun'26) · kiro.dev/docs+blog · Replit plan-mode
docs/blog · lovable.dev chat-mode blog · cursor.com/blog/plan-mode · docs.devin.ai
interactive-planning · arXiv 2310.10996 (ClarifyGPT) · 2410.13788 · 2405.12063 · 2008.00279 ·
2402.01934 · 2507.02564 (LLMREI) · 2501.19297 · 2412.06771 · Xu doi 10.1111/cdev.13708 ·
Skene doi 10.1111/cdev.13730 · arXiv 2211.14228 · 2505.01106 · ChatScratch 2402.04975 ·
StoryDrawer doi 10.1145/3491102.3501914 · NN/g children's UX reports.
