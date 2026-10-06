# ADR 0007 — Rive (.riv state machine) as Sparky's avatar engine

> Index: `docs/decisions/LOG.md` (D16). Status: **Locked (v0), keystone PROVEN.**
> Evidence: `docs/research/sparky-comes-alive.md` (§Avatar) + the de-risk spike. Milestone: **M4** (#17).

## Context

Sparky was a **static yellow ⚡ emoji** (`AvatarChat.tsx:84`). M4 makes him a *living* avatar that idles
"alive" and **reacts to build-state**. The app already streams the state an avatar would animate to —
`buildStatus.phase` (the "what Sparky's doing" ticker) and `messages[].streaming` — reactively from Convex.
So the engine's real job is to be **a visual readout of agent state**: we need to flip a named animation
state from React, not hand-author tweens.

## Options considered

1. **Rive (chosen)** — `.riv` state machines via `@rive-app/react-canvas`.
2. **Lottie** — `@lottiefiles/dotlottie-react` (classic `lottie-react` is deprecated).
3. **Layered-SVG rig + Motion** (ex-framer-motion).
4. **Sprite-sheet / CSS animation.**
5. **2D canvas (PixiJS).**
6. **3D (Three.js / R3F, Ready-Player-Me / VRM).**
7. **Pre-rendered video / GIF.**

## Decision

**Option 1 — Rive, via `@rive-app/react-canvas`.** Bind `buildStatus.phase`/`streaming` → a `mood` **number
input** on the `.riv` state machine, in a single `phaseToMood()` mapping:

```ts
const mood = useStateMachineInput(rive, "<machine>", "mood");
mood && (mood.value = phaseToMood(buildStatus?.phase, streaming)); // idle/talking/building/celebrate/oops
```

## Why

- **It is a state machine you flip from React** — the exact shape of the data we already have. The designer
  owns *how* "excited" looks; React only ever sets a number. Cleanest possible seam between agent state and
  animation, with no hand-tweened timeline code.
- **It's the canonical "alive mascot for kids" engine** — the same one Duolingo uses for Duo. State
  machines blend between poses (squash/stretch, real easing), so idle blink/breathe + distinct emotions are
  first-class.
- **Lip-sync is a documented path** (viseme inputs) for when read-aloud lands (#18) — no re-platforming.
- **Licensing/perf are clean:** runtimes are **MIT, no runtime fee, free editor**; ~200 KB WASM one-time,
  `.riv` assets are tiny (~2–16 KB), GPU-rendered (won't jank a kid's tablet on a perpetual idle loop).
- **Keystone PROVEN in our stack** (de-risk spike): `@rive-app/react-canvas@4.28.6` renders as a
  `'use client'` component with **no `dynamic ssr:false`, no WASM config, no `next.config` changes**;
  `tsc` + `npm run build` green. The exact `useStateMachineInput(...).value = n` binding works.

**Rejected:** Lottie (timeline-first — you'd fake state transitions in React; emotion blends look like
cuts; safe fallback if Rive art proves unobtainable) · SVG-rig+Motion (hand-author every pose — highest
effort, stiffest) · sprite/CSS (no blending/lip-sync — dead-ends on expressiveness) · PixiJS (rebuilding
Rive by hand) · 3D (wrong aesthetic for a warm 8–12 mascot, biggest cost) · video/GIF (can't react to live
state or lip-sync).

## Consequences

- **Asset dependency (the one handoff):** we need a *Sparky* `.riv` with a `mood` state machine. Sources, in
  order: reskin a **Rive Marketplace/Community** mascot (free Rive account → a stop-and-ask for the owner),
  AI-generate art + rig in the **free Rive editor**, or ship a CSS/Motion placeholder and drop the `.riv` in
  later. The Rive *decision* stands regardless of which asset path we take.
- **Hardening follow-up:** the avatar currently maps from kid-facing `buildStatus.phase` *prose*. Add a typed
  `mood: v.optional(v.string())` to the `buildStatus` schema and set it in the tool handlers, so the avatar
  binds to **typed state** that can't silently break when a phrase is reworded. (File as a follow-up.)
- Client-only component (`'use client'`); lazy-loads the WASM at runtime via fetch.

## Status & revisit-trigger

**Locked for v0.** Revisit only if Rive's runtime licensing changes, or a usable `.riv` proves obtainable
only at disproportionate effort/cost — in which case the documented fallback is **Lottie** (dotLottie state
machines) behind the same React-driven-input shape.
