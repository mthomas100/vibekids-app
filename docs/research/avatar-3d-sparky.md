# 3D "alive" Sparky — research synthesis (2026-07-08)

> Research-agent brief, commissioned to make Sparky feel 3D and alive, with a mouth that moves
> while Sparky reads aloud. **Recommends superseding ADR 0007 (Rive)** — that supersession is a
> [USER CALL]; do not act on it without the owner's ratification.

## Recommendation (TL;DR)

Go real 3D with **@react-three/fiber v9 + drei v10**, but build Sparky's FACE the way Nintendo
does, not the way avatar startups do: **mouth and eyes as flat texture/mesh overlays on the head
(the Animal Crossing technique), not blendshapes.** This decouples the two risky problems — asset
sourcing and lip-sync — because ANY cute panda body works once the face is ours. Drive the mouth
with a **text→viseme timeline synced by an estimation clock that boundary events re-anchor when
available.** Do NOT go Rive; do not hunt for a blendshape-rigged asset.

## Staged path

- **Stage 1 (1–2 days, shippable):** primitives-built 3D Sparky — spheres/capsules matching the
  current SVG's exact design language (round head, ear circles, eye patches, spark bolt, blush)
  with `MeshToonMaterial`. Flat-shaded chunky primitives with toon shading IS the Toca/Sago look.
  The current SVG panda is literally an orthographic projection of this build — brand continuity
  free. Add the idle-life system + 4-shape viseme mouth.
- **Stage 2 (optional):** swap the primitives body for a sourced/AI-generated GLB under the same
  face rig if Stage 1 isn't cute enough.
- **Stage 3 (post-#26):** when cross-origin isolation lands and Kokoro unblocks, swap the mouth's
  *data source* from text-estimation to audio-accurate (met4citizen **HeadTTS** = Kokoro speech
  WITH word timestamps + visemes; **wawa-lipsync** = amplitude→viseme from any AudioContext).
  Architecture below makes this a data-source swap, not a rebuild.

## Why not Rive (re-opens ADR 0007 — needs a superseding ADR)

ADR 0007's own revisit-triggers have fired, twice:
1. **Pricing changed** — Rive is now "free to create, **$9/mo to ship**" (exports became paid; the
   ADR's "free editor, no runtime fee" premise is stale).
2. **The asset was always the acknowledged handoff risk**, and 2025 field reports are bad (Grayhat
   Studio: days lost in nested-artboard input plumbing, "half-baked" components, exports paid
   mid-project; verdict "not ready for serious production beyond splash animations"). Duolingo makes
   Rive sing with a dedicated animation team + 20+ hand-drawn mouth shapes + server-side phoneme
   timestamps — none of which we have. r3f skills/code compound toward the stated 3D north star
   (#22); Rive editor time doesn't.

## Stack — exact versions

- `three` (latest), `@react-three/fiber@^9.5` (the React-19-compat release; repo is on 19.2.4 ✓),
  `@react-three/drei@^10` (pairs with fiber v9; **drei 11 / fiber 10 are alpha — don't touch**).
- Next 16: `'use client'` component via `next/dynamic` `ssr:false`; keep the SVG Sparky as loading
  placeholder + no-WebGL fallback (zero-flash progressive upgrade).
- Bundle: ~150–170KB gz three + ~35KB fiber + cherry-picked drei; lazy-load off chat TTI.
- Perf budget (Chromebooks/iPads): one low-poly character at 260–320px is trivial; the risks are
  DPR and React, not the GPU. `dpr={[1, 1.5]}`, `gl={{ antialias: false, powerPreference:
  'low-power' }}`, no shadows/postprocessing, <20 draw calls. **Never setState per frame** — refs
  inside `useFrame` with `maath` damp, zero per-frame allocations. rAF auto-throttles hidden tabs.
  The `<iframe srcdoc>` preview composites independently (~1ms/frame cost here).

## The face rig (the load-bearing idea)

Animal Crossing / Wind Waker faces are texture-swapped flat planes — no geometry deformation.
Sparky: mouth = one small plane/ellipse set on the muzzle with **4 shapes: closed, open ("aa"),
wide ("ee"), round ("oh")** — crossfade/scale between them. Eyes = white spheres + pupil discs
(saccades/look-at by offsetting pupils; blink via eyelid plane or Y-scale). At 150–300px, 4 mouth
shapes read as fully alive (Duolingo's 20+ matter at full-screen with real phoneme timing).

## Mouth sync with ONLY speechSynthesis

Facts: no audio stream access ever (amplitude analysis dead until Kokoro); `boundary` events fire
on **local** voices (ChromeOS ✓, iPad WebKit ✓ though Safari omits `charLength`, Chrome Android ✗)
but **NOT on Google network voices** — which `pickVoice()` currently *prefers* (+50 google, +25
non-local). So boundary can only be a correction signal, not the driver.

**Architecture: renderer-agnostic viseme bus + estimation clock, boundary-corrected** (met4citizen
TalkingHead's `wordsToVisemes` approach — rule-based English text→viseme, ~80% accurate, MIT —
simplified to 4 shapes):

```ts
// lib/voice/visemes.ts (pure, testable)
type Viseme = 'closed'|'open'|'wide'|'round';
// letter classes: a→open, e/i/y→wide, o/u/w→round, m/b/p→closed, other consonants→closed-ish flick
// per-word duration ≈ 90ms + 50ms/char, clamped [140, 450]; 40ms 'closed' gap between words
export function visemeTimeline(text: string): { t: number; v: Viseme }[];

// lib/voice/mouthBus.ts — singleton, mirrors the existing onSpeakingChange pattern
mouthBus.start(piece)       // u.onstart: compute timeline, t0 = now
mouthBus.anchor(charIndex)  // u.onboundary: snap clock to that word (kills drift on local voices)
mouthBus.stop()             // u.onend / interrupt()
mouthBus.sample()           // → current Viseme; called by the avatar's useFrame
```

Wire-in ≈ 6 lines inside `speakCurrent()`; the FIFO/lock/dedup machinery untouched; `isSpeaking`
stays the master gate; the SAME bus can drive the SVG mouth today. In the avatar, `useFrame`
samples the bus and damps each shape's weight toward target (0.06–0.08s damping makes even wrong
visemes look intentional). Estimation alone at ≤180-char chunks stays convincing; boundary
correction makes it tight on Chromebooks/iPads.

## Idle life (where "alive" actually comes from)

All mapped from the existing `Mood` seam: blink every 2–6s (~120ms, occasional double), breath
3.5–4s at 2–3% Y-scale with shoulder counter-motion, micro weight-shift via low-frequency simplex
noise (never perfectly still), saccades every 1–4s + damped head look-at (cursor / latest bubble /
preview while building — the single biggest "it sees me" effect), celebrate = jump with
anticipation + squash on land, oops = ear droop + head tilt, listening = lerp-damped head tilt.

## Fallback plan

If 3D looks wrong after day one: the viseme bus + idle-life timers are renderer-agnostic — point
them at the existing SVG and ship that; zero wasted work. If the Stage-2 asset hunt fails: stay on
primitives (it's the brand anyway). Asset sources: Poly Pizza pandas (CC0/CC-BY static bases),
Sketchfab CC panda tags, Meshy/Tripo text→3D + auto-rig for a body (their facial rigs are
noisy-to-absent — fine, the face overlay doesn't need them). Quaternius animal pack: no panda.

## Do NOT

- Don't buy/learn the Rive editor this week; don't adopt VRM/three-vrm (humanoid spec; a panda
  doesn't conform).
- Don't hunt for a blendshape-rigged panda or expect Meshy/Tripo facial morphs.
- Don't attempt amplitude lip-sync on speechSynthesis; don't flip COEP headers for Kokoro now
  (#26 — breaks the iframe preview).
- Don't make boundary events the only sync source (network voices fire none — and `pickVoice()`
  actively prefers those); don't render at native DPR; don't setState per frame; no drei-11/fiber-10
  alphas.
- File the ADR-0007 supersession and the `pickVoice` boundary-tension as issues rather than solving
  voice selection this week.

Key sources: r3f v9 migration guide · pmndrs/drei releases · github.com/met4citizen/TalkingHead
(+ HeadTTS) · blog.duolingo.com/world-character-visemes/ · rive.app/blog/rive-s-new-9-mo-plan ·
grayhat.studio Rive 2025 post-mortem · MDN boundary/localService · Animal Crossing face-texture
threads (blenderartists) · poly.pizza · Meshy/Tripo rigging docs
