# Competitor gen-coding gaps — research synthesis (2026-07-08)

> Fourth brief of the "next-level" session's research wave. Covered Lovable, Bolt.new, v0.dev,
> Replit Agent (Agent 3, 2025-26); kid tools Scratch, Roblox Studio Assistant, Code.org, Tynker;
> + Duolingo/Khan Kids for delight patterns.
> **Through-line: Sparky is the most underused asset** — every winning kid product routes progress,
> error recovery, AND celebration through a reacting character. We already have one.

## The 7 areas — what the big players do

1. **Build progress UI.** Narrated steps beat spinners. Lovable: "build cards" with live narration,
   files-being-modified, exact file+line citations, a "Show all" timeline. Bolt: steps panel + streaming
   code + terminal. v0: streams JSX into the preview live, 3 variations at once. Biggest 2025-26 shift:
   **plan-then-build** (Lovable Plan Mode, Replit Plan mode) — a reviewable plan with steps/success
   criteria, built only after approval. Replit Agent 3 shows a live browser with its own cursor
   self-testing the app.
2. **Wait-time engagement.** Motion + narration + incremental reveal; Lovable's narrated feed keeps
   users watching "even a full minute" and lets them queue follow-ups. Code.org's kid product
   *deliberately simulates* a generation delay — the wait reads as "real AI" to kids.
3. **Onboarding.** Prompt box front-and-center + template cards + a remixable community gallery
   (Lovable), clickable example prompts (v0), guided tutorials → free play (Tynker).
4. **Error recovery.** Read-your-own-errors-and-auto-heal (Bolt patches from terminal+console in one
   step; Replit Agent 3 clicks around the real app to test and fixes what broke). Raw stack traces are
   never shown. The character should OWN the error ("Oops, let me fix that!").
5. **Iteration affordances.** **Click-the-preview-to-edit is table stakes** (Lovable element toolbar,
   v0 targeted patches). Rule: chat for behavior, click-to-edit for style. Safety net: Replit
   checkpoints (files + convo + DB, one-click rollback); Lovable per-edit versions. Screenshot upload
   is universal.
6. **Celebration/gamification.** Adult tools are weakest here (payoff = a URL). Khan Kids: a character
   that physically celebrates + immediate ding/sparkle audio-visuals; deliberately avoids abstract
   badges at young ages. Duolingo reserves special animations for milestones only — same animation on
   every action becomes wallpaper (redesigning just the day-7 animation moved retention +1.7%). Lesson
   for 8–12: reacting character + immediate delight > points/leaderboards.
7. **Sharing/remix.** Scratch's remix loop is the gold standard (~30% of all projects are remixes; MIT
   ties remixing to learning). Lovable: public-by-default + Remix button + one-click publish. Deploy-
   to-live-URL is everyone's climax.

## Top-10 gaps (ranked, kid-impact × buildability on the Convex/iframe stack)

| # | Gap | Who | Effort | Status for us |
|---|---|---|---|---|
| 1 | Plan-then-build "Here's my plan!" checklist, kid taps Go | Lovable/Replit | M | **Open** (#45) |
| 2 | Live build narration | Lovable | S-M | ✅ shipped (BuildShow) |
| 3 | Celebration on first render; big ones milestone-gated | Khan/Duolingo | S | ✅ shipped; gating open (#45) |
| 4 | Auto-heal behind a friendly face | Bolt/Replit | M | ✅ shipped (snag banner + fix turn) |
| 5 | **Click-to-edit the preview** (tap an element, tell Sparky) | Lovable/v0 | L | **Open — biggest missing affordance** (#45) |
| 6 | One-tap Remix of other apps | Scratch | M | **Open** (#45) |
| 7 | Kid-facing checkpoints w/ thumbnails | Replit | S-M | Overlaps epic #30 (time machine) |
| 8 | First-run starter cards | Lovable/v0 | S | ✅ shipped (StarterIdeas) |
| 9 | "Show a grown-up!" share moment (QR to running app) | Lovable/Scratch | M | **Open** (#45) |
| 10 | Light milestone stickers | Tynker/Duolingo | M | Open, low priority |

## Refinements to shipped work (research-grounded)

- **(a) Milestone-gate the BIG celebration** — confetti on every completion becomes wallpaper by view
  3 (Duolingo). Give a project's FIRST successful build the full burst; routine builds get a lighter
  beat. → #45.
- **(b) Sparky owns the error** — banner copy moved from "your app hit a snag" to Sparky taking
  responsibility ("Oops, I goofed something!"); raw error goes to the agent loop only. → applied
  same-day.
