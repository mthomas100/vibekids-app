# Research — Sparky Comes Alive (M4: avatar · voice · idea-refinement · grill-activation)

> The M4 research archive. Four parallel Opus streams, 2026-05-30. **Consult before re-deriving.**
> Decisions live in ADR [0006](../adr/0006-voice-in-v0-read-aloud-and-push-to-talk.md) (voice) +
> [0007](../adr/0007-rive-avatar-engine.md) (avatar); LOG D15–D17. Buildable units: issues #17–#21.

The throughline: Sparky stops being *a chat box with a mascot* and becomes *a character the kid
collaborates with* — **present** (animated), **conversational** (talks + listens), and able to **help the
kid figure out what to make**. The whole arc is **additive/low-risk**: it rides on the M3 chip rail, the
continuity injection seam (`app/api/chat/route.ts:50-63`), and the live `buildStatus`/`streaming` state.

## §Avatar — Rive (chosen) → ADR 0007

- **Rive `.riv` state machines** (`@rive-app/react-canvas`) win because Sparky's job is to be a **visual
  readout of agent state**, and Rive is *a state machine you flip from React*: `buildStatus.phase` →
  `mood` number via `useStateMachineInput(...).value = n`. Designer owns the look; React sets a number.
- Same engine as **Duolingo's Duo** (canonical kid mascot). MIT/free, ~200 KB WASM one-time, tiny `.riv`,
  GPU-rendered, **lip-sync via viseme inputs** is a documented path for when voice lands.
- **Keystone PROVEN** (spike): `@rive-app/react-canvas@4.28.6`, `'use client'` is sufficient (no
  `dynamic ssr:false`, no WASM config, no `next.config` change); `npm run build` green; binding API confirmed.
- **Rejected:** Lottie (timeline-first; emotion blends look like cuts; the safe fallback) · SVG-rig+Motion
  (hand-author every pose) · sprite/CSS (no blend/lip-sync) · PixiJS (rebuild Rive by hand) · 3D (wrong
  aesthetic) · video/GIF (can't react to live state).
- **Asset plan (the one handoff):** reskin a Rive Marketplace/Community mascot w/ multi-expression states
  (free account → the owner), or AI-art + rig in the free Rive editor, or a CSS/Motion placeholder first.

## §Voice — read-aloud + push-to-talk STT, on-device & $0 → ADR 0006

- **The two halves are asymmetric.** Read-aloud is low-risk/near-free; kid STT is the hard + biometric half.
- **Read-aloud ($0, no vendor):** Web Speech `SpeechSynthesis` (native) → **Kokoro.js** (on-device neural
  TTS, Apache, ~86 MB one-time, **no API key/server**, blind-ranks *ahead of* Google WaveNet / Amazon Polly).
  Warm read-aloud needs **no paid vendor** — no model spend either (voice ≠ the agent loop).
- **Kid STT — the known-hard part:** zero-shot Whisper ≈ **25% WER on kids vs ~3% adults (~8×)**;
  spontaneous child speech worse. Free Web Speech recognition is the *least* accurate and ships audio to
  Google/Apple. **[USER CALL]** ship push-to-talk STT in the POC anyway (adult-tester fidelity is fine),
  and **evaluate the kid-accuracy live later**. Repair UX neutralizes the risk: recognized text **fills the
  input (confirm-before-send), never auto-sends**.
- **Safety (deferred to Phase 1, see ADR 0006 §Deferred):** kid audio = biometric → parental consent,
  on-device, no storage/training, push-to-talk only, avoid minor-hostile vendors (ElevenLabs bans <18
  voice). Fine for a no-auth local POC; a **hard gate before any real kid**.
- Gotchas: ~200-char Chrome `SpeechSynthesis` cutoff (chunk by sentence); `voiceschanged` async; Safari
  `getVoices()` empty; must be user-gesture-initiated; iOS Safari stops on background.

## §Idea-refinement — the "Making-It Card" (build-first, ratify-second) → #20

- **The inversion:** the grown-up grill interrogates *before* acting; but Sparky already *builds a default
  first*, so the kid version **builds, then aligns on the gap.** For an 8-yr-old, *a question is a tax; a
  tappable choice is a toy* — Khanmigo's own data shows kids bristle at question-asking (goodwill takes 3–4
  sessions; VibeKids gets one shot under the <5-min north star). So **never gate the build on alignment.**
- **The artifact — Making-It Card:** a kid-readable 4-line picture-spec — **Title · What it does · How it
  looks · One special thing** — in the kid's words, beside the preview. Approval is *implicit* (playing the
  preview); tap any line to change (reusing `microchoice` chips). It's the durable **intent** channel,
  injected at the same seam continuity uses, so the model sees *what the code is* AND *what the kid wants*.
- **Plumbing:** 1 tool `update_making_card` + 1 `projects.makingCard` field + 1 prompt-inject line + 1
  component + persona tuning. **Keystone:** can Sonnet write a *truthful* card (no over-promise, right
  reading level)? Fallback: derive the card from the post-build file tree (a *receipt*, not a *promise*).

## §Grill-activation — summoned, not default → #21

- **Governing principle (evidence-backed):** build-by-default; questions are the **summoned, escapable
  exception**; always a visible "just build it!" escape. A grill-by-default would kill the magic (Khanmigo
  Socratic-by-default *frustrates* result-seekers).
- **Opt-out test (sharpened):** ask only when *any single guess is likely wrong* (interpretations diverge)
  **or genuinely unbuildable**; **ties → build**; cap 1 question. **Cold-start → opt-in via chips** (incl. a
  "help me figure it out 🤔" door), NOT auto-questions at a frozen kid. **Over-ambition → one-tap
  "shrink-then-build"** offer. **Iteration-friction → after 2 consecutive rejections**, offer to figure it
  out (Scratch-Copilot "escalate after 2 fails"). **One-offer-then-drop** (Clippy). Questions are always chips.
- **Detection:** start with the cheap deterministic **rejection-counter** + the summoned door;
  **interpretation-divergence sampling** (a fast-tier call → N interpretations + agreement + buildable?) is
  a later upgrade with its own keystone (latency/accuracy on real kid prompts).

## Keystone results

| Keystone | Result |
|---|---|
| Rive drives expression from React in our Next 16 stack | ✅ **PROVEN** (spike, `/spike-rive`) |
| Warm read-aloud with $0 new spend | ✅ **PROVEN by evidence** (Web Speech native; Kokoro on-device) |
| Truthful Making-It Card (no over-promise) | ⏳ test before building the card editor (#20) |
| Interpretation-divergence detector on kid prompts | ⏳ open; not needed for v0 (use rejection-counter) |

## Sources

- **Avatar:** Rive runtime (MIT) + `useStateMachineInput` docs; Duolingo/Duo Rive case; `lottie-react`
  deprecation → `@lottiefiles/dotlottie-react`.
- **Voice:** Kid-Whisper (arXiv 2309.07927); child-ASR error analysis (arXiv 2502.08587); Kokoro.js
  (Xenova / Hugging Face, kokoroweb.app); Web Speech MDN/caniuse + Chrome 139 `processLocally`; ElevenLabs
  + OpenAI minor-audio policies; cloud-TTS pricing (ElevenLabs/Cartesia/OpenAI/Deepgram). VibeKids D3/D7.
- **Idea-refinement:** NN/g *Designing for Kids* + children's usability; Khanmigo review (KidsAiTools);
  Resnick *Designing for Wide Walls*; NAEYC *Guiding Children Using Questions*; Dweck/Stanford
  process-praise + Mindset Kit; *Design Thinking for Kids* (Prisma); dialogic-agent comprehension (PMC9299009).
- **Grill-activation:** Horvitz *Principles of Mixed-Initiative UIs* (CHI 1999); *Modeling Future
  Conversation Turns…* (arXiv 2410.13788); *Controlling the Risk of Conversational Search via RL* (2021);
  ClariQ/ConvAI3 (arXiv 2009.11352); *Ambiguity Detection & Uncertainty Calibration* (ACL TrustNLP 2025);
  Wood/Bruner/Ross contingent-shift (1976); Koedinger & Aleven *assistance dilemma*; *Scratch Copilot*
  (arXiv 2505.03867); Clippy post-mortems.
