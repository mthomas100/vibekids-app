# ADR 0006 — Voice in v0: read-aloud + push-to-talk STT (on-device, $0, no API billing)

> Index: `docs/decisions/LOG.md` (D15). Status: **Locked (v0) [USER CALL].**
> Evidence: `docs/research/sparky-comes-alive.md` (§Voice). Milestone: **M4 — Sparky Comes Alive** (#18 read-aloud, #19 STT).

## Context

v0 deliberately shipped **text + tap-chips before voice** (D3; the `CLAUDE.md` guardrail literally says
"no voice"). The kids-UX research (stream 4) backed that ordering. This ADR **revisits that for the v0
POC**, on the owner's explicit call: to *bring Sparky to life*, Sparky should **read his messages aloud** and
the kid should be able to **talk to him**.

The two halves are asymmetric. Read-aloud (TTS-out) is low-risk, near-free, and binds cleanly to the chat.
Kid talk-back (STT-in) is a known-hard accuracy problem on children's voices **and** the heavier
biometric/privacy surface. Crucially, **voice is a separate service from the agent loop** — it never
touches `CLAUDE_CODE_OAUTH_TOKEN` or Anthropic billing, so the only billing risk is accidentally adopting a
paid voice vendor.

## Options considered

1. **No voice (status quo / D3).** Keep text+chips; defer all voice to Phase 1.
2. **Read-aloud only.** Ship TTS-out now; defer STT-in (the research's recommendation).
3. **Read-aloud + push-to-talk STT (chosen).** Both directions in the POC; STT fills the input and the kid
   confirms before sending.
4. **Full cloud voice.** ElevenLabs/Cartesia TTS + Deepgram/Whisper STT — best quality, but a new paid
   vendor, audio egress, and (ElevenLabs) a ToS that bans under-18 voice data.

## Decision

**Option 3 — read-aloud + push-to-talk STT, both on-device and $0. [USER CALL, 2026-05-30.]**

- **Read-aloud:** Web Speech `SpeechSynthesis` first (native, $0), upgradable to **Kokoro.js** (on-device
  neural TTS — Apache, ~86 MB one-time, no server/API key, ranks *ahead of* Google WaveNet / Amazon Polly)
  behind one swappable `speak(text)` signature.
- **Push-to-talk STT:** Web Speech `SpeechRecognition`, press-to-talk (never always-listening). Recognized
  text **fills the chat input — it does NOT auto-send**; the kid sees it, fixes if wrong, taps **Go!**.
- **No new vendor, no API key, no Anthropic billing impact.**

## Why

- **It's the product bet for M4** — Sparky stops being a chat box and becomes a character you talk *with*.
- **No model spend** because voice is independent of the agent loop, and both halves run
  on-device for $0. Good read-aloud does **not** require a paid vendor (Kokoro proves this).
- **STT is included despite the research's "defer" rec — deliberately, for the POC.** The owner wants to
  *evaluate the kid-accuracy problem live* rather than take it on faith (see limitation below). The
  POC will be exercised with an adult voice, where Web Speech is accurate; the kid-voice question is a
  later, evidence-based call.
- **The repair UX neutralizes the main STT risk for the POC:** because recognized text only *fills the
  input* (confirm-before-send), a misheard word is a visible, fixable thing — never a broken build.

## Known limitation (documented on purpose)

**Children's-voice STT is ~25% word-error vs ~3% for adults (≈8×).** Spontaneous child speech is worse
still. The POC will not surface this (adult tester), so the kid-accuracy of `SpeechRecognition` is an
**open question to evaluate live later** — if it's demonstrably bad, the Phase-1 path is on-device,
child-tuned, or heavier-repair STT. Do not assume the POC's adult-voice fidelity generalizes to kids.

## Deferred to Phase 1 — safety obligations (do NOT ship voice to a real child without these)

> **This block is the forward-carried safety debt.** v0 is **local-dev-only, no auth, no real children**,
> so shipping voice in the POC crosses no line *today*. The moment voice is exposed to an actual kid
> (Phase 1), **all of the following are hard prerequisites.** Mirrored in `ROADMAP.md` Phase 1 and issues
> **#8** (COPPA/consent) and **#9** (Voice).

- **Verifiable parental consent (COPPA)** for **audio/biometric capture** — a child's voice is biometric.
  Consent belongs at the Phase-1 boundary (adults authenticate, kids are profiles — D7).
- **Kid audio = ephemeral, on-device, never stored, never trained on** (the roadmap's stated stance). No
  raw audio to Convex, no voiceprint, no audio files persisted.
- **Web Speech `SpeechRecognition` sends the kid's audio to Google/Apple by default.** For real kids, move
  to **on-device STT** (whisper.cpp / Transformers.js) or consent-gated cloud — not the default browser API.
- **Read-aloud must stay on-device** (Web Speech / Kokoro). Do not route kids' interaction text through a
  cloud TTS that logs it.
- **Push-to-talk only** — never always-listening / ambient capture.
- **Avoid vendors hostile to minors' audio** — ElevenLabs' ToS bans under-18 voice data; OpenAI requires
  guardian permission. Treat these as signals to keep kid *audio capture* off third-party cloud.

## Status & revisit-trigger

**Locked for the v0 POC.** The "Deferred to Phase 1" obligations above are the **revisit-trigger**: before
exposing voice to anyone but the owner on local dev, this ADR's deferred block must be satisfied. Reconsider
the engine choice (paid TTS, child-tuned STT) only when real-user quality/consent needs justify it.
