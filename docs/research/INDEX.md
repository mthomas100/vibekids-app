# Research Index

> The front door to VibeKids' design research. **Purpose: stop the #1 failure — re-doing settled research.**
> Consult here before re-deriving anything. The original v0 architecture plan and a few standalone
> reports (AI-layer comparison, kids-UX/COPPA, subscription billing, market and business research)
> were kept outside the repo and are not included; their conclusions live in the ADRs and
> `docs/decisions/LOG.md`.

## The v0 research streams (folded into ADRs)

| # | Stream | One-line takeaway | Where it landed | Status |
|---|---|---|---|---|
| 1 | Sandbox / preview | iframe `srcdoc` (Tier A) + Sandpack (Tier B) run on-device, $0, safest for kids; WebContainers rejected (license/cap/COOP-COEP); cloud sandboxes → Phase 2. | ADR [0003](../adr/0003-iframe-srcdoc-sandpack-preview.md) | **Settled** |
| 2 | AI-layer comparison | The agent loop needs in-process custom tools + streaming; on the Max sub only the Agent SDK delivers all three (Vercel AI SDK = prod path). | ADR [0001](../adr/0001-agent-sdk-on-max-subscription.md) | **Settled** |
| 3 | Backend: Convex vs Supabase | Convex collapses data + realtime into one transport → "watch it build" needs zero socket code; Supabase/Postgres make us own realtime. | ADR [0002](../adr/0002-convex-as-realtime-store.md) | **Settled** |
| 4 | Kids-UX + COPPA | Low-floor/high-ceiling/wide-walls; ages 8–12; text+chips before voice; adults-auth / kids-as-profiles is the clean COPPA posture; "latency is a feature". | ADRs [0003](../adr/0003-iframe-srcdoc-sandpack-preview.md)/[0004](../adr/0004-no-auth-anon-workspace-v0.md) | **Settled** |
| 5 | Agent auth & billing | API key is the default and the only path for anything other people use; a personal `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`) is an opt-in for local experiments only; the `ANTHROPIC_API_KEY`-outranks-OAuth precedence footgun. | ADR [0001](../adr/0001-agent-sdk-on-max-subscription.md) | **Settled, proven** |

## M3 build-phase research

| Topic | One-line takeaway | Location | Status |
|---|---|---|---|
| Micro-choice feedback model | The whole AI-builder category (Lovable/Replit/v0/Bolt) **queues** mid-build input as the *next turn* — nobody injects mid-stream (Cursor tried, retreated); cross-turn **continuity** is table-stakes. | [`micro-choice-feedback-model.md`](micro-choice-feedback-model.md) → ADR [0005](../adr/0005-micro-choice-feedback-queue-next-turn.md) (D13) | **Settled** |

## M4 research — Sparky Comes Alive (avatar · voice · idea-refinement · grill-activation)

Four parallel research streams (2026-05-30), synthesized in [`sparky-comes-alive.md`](sparky-comes-alive.md).

| Stream | One-line takeaway | → |
|---|---|---|
| Avatar tech | **Rive** `.riv` state machine — flip `buildStatus.phase → mood` from React; Duolingo's engine; keystone PROVEN. | ADR [0007](../adr/0007-rive-avatar-engine.md) |
| In-browser voice | **Read-aloud + push-to-talk STT, on-device & $0** (Web Speech → Kokoro.js); kid-STT ~8× worse → safety deferred to Phase 1. | ADR [0006](../adr/0006-voice-in-v0-read-aloud-and-push-to-talk.md) |
| Idea-refinement | **Making-It Card** — build-first, ratify-second; the kid's *intent* channel. | #20 |
| Grill-activation | **Summoned, not default** — sharpened opt-in/opt-out rules (Horvitz/Clippy/Scratch-Copilot). | #21 |

## Versioning / diff / admin-console architecture (2026-05-31)

Nine-agent fan-out off the ADR 0008 `/admin` time machine. Synthesized in
[`versioning-architecture.md`](versioning-architecture.md).

| Stream | One-line takeaway | → |
|---|---|---|
| Versioning paradigm + viewers | **Not reinventing the wheel** (append-only snapshot table = the non-git-CMS norm), **not over-engineered**. The one fix: **group by turn, not by file** — done **read-side** over the existing `by_project_turn` index (no migration; DB ~150 KB). Adopt git's *model*, not its *machinery*. Picks: **Shiki** (Source) · side-by-side over the installed `diff` · Sparky per-turn `{emoji,category,summary}` label. | **Landed as** ADR [0009](../adr/0009-turn-grouped-history-read-side.md) (D20) + [0010](../adr/0010-project-equals-app-multi-file-repo.md) (D21); epic #30 |

## Agent-SDK capability notes (2026-06-06)

| Topic | One-line takeaway | Location | Status |
|---|---|---|---|
| Is the Agent SDK Claude-only? | **No, but Claude is the only first-class path.** All four native lanes (API key, Max-sub OAuth, Bedrock, Vertex) serve **Claude**; non-Anthropic/local models work *only* via `ANTHROPIC_BASE_URL` → an Anthropic-Messages-compatible gateway/proxy (LiteLLM/vLLM/Vercel Gateway). Our `LLM_PROVIDER` flag is two *Claude* lanes, not a provider switch. Reinforces ADR 0001; no decision changes. | [`agent-sdk-non-anthropic-models.md`](agent-sdk-non-anthropic-models.md) | **Reference** (verified 2026-06-06) |

## "Next-level" research (2026-07-08)

Four parallel research agents; all four delivered.

| Stream | One-line takeaway | Location | Status |
|---|---|---|---|
| Wait-time engagement | Labor illusion is empirically real (show the work); kids wait best doing DESIGN work that feeds the next turn (Draw-a-Sprite, Sound Booth); **never nudge a mid-build project hop** (attention residue; protect the reveal) → killed the detour nudge (D25). | [`wait-time-engagement.md`](wait-time-engagement.md) | **Actioned** |
| 3D Sparky | r3f v9 + drei v10, primitives body + **Animal-Crossing-style face overlay** (4 visemes, NOT blendshapes), text→viseme estimation clock; **recommends superseding ADR 0007 (Rive)** — pricing changed + asset-handoff risk. Supersession is an owner decision. | [`avatar-3d-sparky.md`](avatar-3d-sparky.md) | **Pending owner decision** |
| Design-system validation | Toy Arcade palette confirmed; ONE defect: white labels fail WCAG on aqua/sun/lime → **ink-on-fill house rule** (D25); + tang error hue, sunken surface, color roles. | [`design-system-validation.md`](design-system-validation.md) | **Actioned** (same-day fix) |
| Competitor gaps | Today's ships (narration/celebration/auto-heal/starter cards) ARE the table stakes; biggest OPEN gaps = **click-to-edit the preview**, plan-then-build, one-tap Remix, share moment, milestone-gated celebration. Through-line: route everything through the character. | [`competitor-gen-coding-gaps.md`](competitor-gen-coding-gaps.md) | **Captured** → epic #45 |

## Safety & privacy architecture

| Topic | One-line takeaway | Location | Status |
|---|---|---|---|
| PII redaction + content-moderation architecture | An on-device redaction pass is the canonical **"local AI proxy"** pattern (detect → stable placeholders → send sanitized → restore), with **3 refinements**: **regex + small NER** (GLiNER/Presidio — regex misses names and school names), the **voice/ASR trap** (cloud ASR discloses biometric audio *before* on-device redaction can touch it), and **on-device AND server-side** (defense in depth, **fail closed**). Small NER for PII vs. **Llama Guard** for content safety. Live tie-in: v0's Web-Speech **cloud ASR** *is* the voice trap (→ **#26**). | [`pii-redaction-architecture.md`](pii-redaction-architecture.md) | **Reference** (2026-05-31) |
| Dream-It-Up patterns (clarify-before-build for kids) | The 6-agent brief behind **D26**: industry convergence = **opt-in trigger · 2–5 question budget · options-first + free-text custom + skip · one explicit go, never re-confirm**; evidence = ClarifyGPT **+9.8pts**, **3–5 options > 2**, dialogic *Expand* **+0.60 SD** on kids; kids-specific = chips carry the load (typing is the escape), refine-don't-replace the kid's idea. | [`dream-it-up-patterns.md`](dream-it-up-patterns.md) | **Actioned** (D26, 2026-07-08) |
