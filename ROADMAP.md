# VibeKids — Roadmap

> **A friendly avatar that helps kids (8–12) "vibe code" their own apps.**
> Say it → watch it build → play it. Lovable/Replit magic, redesigned for children.
>
> Issue numbers (#NN) refer to the project's original private issue tracker.
>
> **Public-copy note (2026-10-05):** this copy defaults to an Anthropic API key (`LLM_PROVIDER=api`). Entries that mention the Claude Max subscription record how the original private prototype was developed; here that path survives only as an opt-in for personal local experiments. See Anthropic's [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview) on authentication.

VibeKids is a web app where a kid describes an idea in plain words (or taps a suggestion),
a friendly avatar ("Sparky") *builds it for them* using AI, and a **live preview** appears
right next to the chat. The bet: the unowned wedge is the intersection of a kid-safe
conversational builder + AI that does the work + short-attention-span mechanics + child-safety
guardrails.

---

## North star

A 9-year-old with no coding experience makes something they're proud of in **under 5 minutes**,
laughs at least once, and immediately wants to make another.

## Guiding principles

- **Low floor, high ceiling, wide walls** (Resnick/Scratch) — trivial to start, room to grow, *many*
  kinds of projects so every kid finds something personally meaningful.
- **Say it and it's built** (Lovable) — the AI does the work; the kid stays in "creative director" mode.
- **Latency is a feature** — every wait is filled with a **micro-choice that feeds the build** (pick the
  color/sound/name). Active waiting feels shorter and becomes creative input.
- **Anti-Clippy companion** — opens with idea-sparks, never interrupts uninvited, **process-praise + "not
  yet"** (Dweck), celebrates wins, no streak-guilt.
- **Safety is a gate, not a feature** (Khanmigo) — constrained generation + output moderation; designed
  in, not bolted on.
- **One realtime transport** (Convex) for both the chat and the live preview — fewer moving parts.
- **One provider flag** — the Claude Agent SDK authenticates per `LLM_PROVIDER` (API key by default);
  model ids live only in `lib/ai/provider.ts`.

## Status legend

`[ ]` todo  ·  `[~]` in progress  ·  `[x]` done  ·  🔒 gated on a dependency

---

## Phase 0 — v0 Proof of Concept  ⟵ **CURRENT**

**Goal:** prove the core magic end-to-end, on the real stack, running on the Max subscription.
**Scope cuts:** no auth, no compliance plumbing, no cloud sandboxes. A complete-*feeling*
but stripped app to decide "is there something here?" (Voice — read-aloud + push-to-talk — is pulled
forward into **M4** as a local-dev POC; the COPPA/consent plumbing stays deferred to Phase 1 — see ADR 0006.)

### M0 — Foundations + engine proof — ✅ DONE (2026-05-30)
- [x] Verify toolchain (Node 22, npm, `claude` CLI present)
- [x] Scaffold Next.js (App Router, TS) + Convex in this repo
- [x] `claude setup-token` → `.env.local` (`CLAUDE_CODE_OAUTH_TOKEN`); env-guard scrubs `ANTHROPIC_API_KEY`
- [x] **Engine proof:** one real `query()` call with a custom tool + streaming worked end to end (in this copy: `npm run smoke-test`)
- [ ] Sanity-check Opus routing — *still open; the proof ran Sonnet*
- **Done when:** an Agent-SDK call with custom tools works end to end on the planned credential. ✅

### M1 — Walking skeleton — ✅ DONE (2026-05-30)
- [x] `/api/chat` Node route runs Agent SDK `query()` with one custom tool (`write_file`)
- [x] Tool writes to Convex; split-screen UI renders avatar text + a live `<iframe srcdoc>` preview
- [x] Type *"make a red button that says hi"* → it appears in the preview, live
- **Done when:** chat → AI writes a file → preview updates, fully on the subscription. ✅

### M2 — Full tool set + generative UI — ✅ DONE (2026-05-30, verified live)
- [x] Tools: `create_project`, `edit_file`, `run_preview`, `suggest_idea`, `start_micro_choice`
- [x] Render the avatar streaming + tappable suggestion chips from Convex `messages`/`suggestions`
- [x] Model routing: Haiku (chat/chips) · Sonnet (codegen) · Opus (hard scaffolds)
- **Done when:** a kid can build a small multi-step app entirely via chat + chips. ✅

### M3 — Preview tiers + "while-you-wait" mechanic
- [ ] Add Sandpack (Tier B) for React/multi-file apps alongside the iframe (Tier A) — #3
- [x] **Micro-choice that visibly changes the result** — queue/next-turn (ADR 0005) + cross-turn
  continuity (#15), verified live 2026-05-30. (Trigger persona-tuning still open → #16.)
- [x] `buildStatus` live ticker polish — kid-framed activeForm phrases — #2 *(2026-07-08: BuildShow —
  step trail + striped current bar + rotating fun facts + long-build detour, on machine-readable
  `buildStatus.state`, verified live)*
- [ ] Giant ▶ Play button + progressive preview reveal — #4
- **Done when:** waits are filled with a choice that feeds the build; React apps preview too.

### M4 — Sparky Comes Alive 🔥  ⟵ **CURRENT** (avatar + voice ✅; finishing)

**Goal:** Sparky stops being a chat box with a mascot and becomes a *character the kid collaborates
with* — **alive** (animated), **conversational** (talks + listens), and able to **help the kid figure
out what to make**. The embodiment + alignment layer on top of the proven M2/M3 loop.

**Avatar + voice — ✅ DONE & verified live (2026-05-31):**
- [x] **Living avatar** — the static ⚡ is now a big, present **panda** (top-left hero, chat below) that
  idles "alive" + reacts to build-state (`buildStatus`→`mood`: idle → building wobble → celebrate pop) +
  **mouth-syncs to read-aloud**. CSS/SVG renderer; **Rive** is the documented upgrade (ADR 0007) — #17
- [x] **Read-aloud** — **instant ~90ms acknowledgement** then ordered beats (no skip/backlog); auto-read
  on by default — #18
- [x] **Push-to-talk STT** — "🎤 Talk to me!" → live transcript + sound-bar listening cue → "Send it!" — #19

**Do soon — finish M4:**
- 🔒 **Warm voice** — *gated on cross-origin isolation (#26)*. Kokoro.js **evaluated & reverted** (#24): ran ~8s/beat — the app isn't
  cross-origin-isolated → single-thread WASM (a Web Worker fixed UI jank, not latency). Read-aloud
  stays on **Web-Speech**. Warm voice needs COOP/COEP → **#26** (keystone: does it break the srcdoc
  preview/Convex?); mobile load+latency → **#25**. (LOG D18 + L11.)
- [ ] **Making-It Card** — build-first, ratify-second alignment artifact (the kid's *intent* channel) — #20
- [x] **Dream-It-Up mode** — the summoned grill, leveled up per **D26 [USER CALL]** (2026-07-08, verified
  live): a **multi-question** (budget 5) pre-build interview behind an opt-in door on the empty canvas —
  chips-first + free-text secondary, 🎲 surprise-me, recap-card gate, 🚀 build-now escape everywhere.
  #21 stays open ONLY for the auto-offer/divergence activation framework (follow-ups: #46 question
  pregen latency, #47 mid-project summon)

**Later / north star:** 3D talking avatar (#22) · audio-reactive listening bars (#23).

- **Decisions:** Rive (ADR 0007) · voice-in-v0 incl. push-to-talk STT **[USER CALL]** (ADR 0006, with
  deferred Phase-1 COPPA/biometric obligations) · grill summoned-not-default + Making-It Card.
- **Done when:** Sparky is alive, reads aloud (Web-Speech now; warm voice deferred → #26), and the kid
  can talk to him; and (to finish M4) Sparky helps a kid align on an idea via the Making-It Card.

### M5 — Make it feel complete
- [x] Project **shelf** (list/open past projects) persisted in Convex *(landed with ADR 0010; repainted
  as tilted sticker cards 2026-07-08)*
- [x] Celebration moment (confetti + avatar) on a working build *(2026-07-08: 34-piece confetti +
  "Finished it in Xs!" stamp + fanfare on the watched `finishCount` edge, verified live)*
- [~] Friendly error handling (no raw stack traces) + Haiku output-safety pass *(2026-07-08: runtime
  auto-heal — iframe error-catcher → snag banner → "Ask Sparky to fix it" turn, verified live; plus
  error-turn retry chip. The Haiku output-safety pass is still open)*
- [ ] Persona polish (reading level, encouragement, one-idea-per-bubble)
- **Done when:** it feels like a real little product, not a demo.

### M6 — DX + deploy path (optional for v0)
- [ ] Document the local run; `.env.example`
- [ ] Stub Vercel + Convex prod deploy and the `LLM_PROVIDER=api` switch (don't ship publicly)

---

## Phase 1 — Real-product foundations

*Unlocks real users. Mostly the things v0 deliberately skipped.*

- [ ] **Auth** — Clerk; **only adults log in** (parent/teacher), **kids are profiles, not credentials**
- [ ] **COPPA / AADC** — verifiable parental consent (incl. **audio/biometric** consent for voice, see
      ADR 0006), data minimization, no dark-pattern nudges
- [ ] **Safety hardening** — dual-layer moderation on AI *output* + input, crisis routing, no open-ended
      companionship (building helper only)
- [ ] **Voice** — *read-aloud + push-to-talk were prototyped in M4's local-dev POC (#18/#19); this phase
      owns the consent hardening before any real kid.* Verifiable **parental consent for audio/biometric
      capture** (kid voice = biometric: ephemeral, on-device, never stored, never trained on); move Web
      Speech STT → **on-device** (whisper.cpp / Transformers.js) or consent-gated cloud; push-to-talk only;
      forgiving repair UX for the ~8× kid-STT accuracy gap. **→ ADR 0006 §Deferred.**
- [ ] **Split-loop prod AI** — Vercel AI SDK foreground (API, cheap Haiku) + Agent SDK heavy-build lane
      (API/Bedrock/Vertex); subscription stays a *local-dev-only* optimization
- [~] **Snapshots/undo** — data model + dev tool **landed early in v0** (ADR 0008, D19): append-only
      `fileVersions` (one immutable, turn-stamped snapshot per write) + a dev-only `/admin` time machine
      (source / diff / **non-destructive rollback**). **Paradigm fixed read-side** (ADR 0009/D20, verified live;
      `docs/research/versioning-architecture.md`; epic #30): **group by turn, not by file** over the
      existing `by_project_turn` index — no migration (DB ~150 KB). **Shipped & verified:** a Files|Turns
      `/admin` view (whole-app-as-of-turn render + per-file Changes + Files manifest + **non-destructive
      whole-turn Restore**) · **Shiki** Source highlighting (#28 ✅) · **side-by-side** diff (#31 ✅) · a
      pre-existing blank-iframe render bug fixed (SandboxedPreview). **Next:** Sparky's per-turn
      `{emoji, category, summary}` label (#32, capture-now). **Phase 1 (kid-facing):**
      the time machine — thumbnails + preview + "go back" (layer 3, behind a flag). **Deferred
      (trigger-gated):** persisted `commits`/`commitFiles` (#33), content-hash dedup (#27), export→git
      materializer (#34).

## Phase 2 — Scale & "real apps"

- [ ] **Cloud sandboxes** (E2B Firecracker / Modal) as opt-in "real app" mode (server + DB + npm)
- [ ] **Durable builds** — long builds survive a kid closing the tab (worker + resumable status)
- [ ] **Separate cookieless preview origin** + strict CSP at scale
- [ ] **Cost controls** — model routing tuning, caching, per-project budgets

## Phase 3 — Growth

- [ ] **Moderated sharing** — a "show a grown-up / save to my shelf" gallery (no open kid-to-kid chat)
- [ ] **Classroom mode** — teacher owns many student profiles; assignments; dashboards
- [ ] **Native tablet** wrappers (Expo) once the web core is proven
- [ ] **Component/template library** expansion (more "wide walls")

---

## Tech stack at a glance

| Layer | Choice |
|---|---|
| App | Next.js (App Router, TypeScript) on Vercel |
| Agent (v0) | `@anthropic-ai/claude-agent-sdk` `query()` + in-process custom tools, on the Max sub |
| Models | Claude Haiku / Sonnet / Opus, routed by task |
| Realtime data | Convex (reactive queries power chat **and** live preview) |
| Preview | `<iframe srcdoc>` (HTML/CSS/JS) + Sandpack (React) |
| Provider switch | `lib/ai/provider.ts` + `LLM_PROVIDER=api` (default) \| `subscription` (personal opt-in) |

## Key risks & open questions

- **Model spend** — heavy Opus codegen is the expensive path; the `fast`/`balanced`/`deep` routing exists to
  keep most turns on Haiku/Sonnet, and per-project budgets are a Phase 2 item.
- **Credentials** — the API key is the only path for anything other people use; the personal
  subscription opt-in is for local experiments only (see Anthropic's Agent SDK docs).
- **Preview fidelity** — iframe/Sandpack cover ~95% of kid apps; the rest waits for cloud sandboxes (Phase 2).

## References

- Claude Agent SDK: https://code.claude.com/docs/en/agent-sdk/overview · custom tools · authentication
- Convex AI: https://docs.convex.dev/ai · Sandpack: https://sandpack.codesandbox.io/docs
