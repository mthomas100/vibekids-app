# Decision Log

> The **scannable index** of why VibeKids is built the way it is — so future agents (and
> future maintainers) don't relitigate settled calls.
>
> Issue numbers (#NN) refer to the project's original private issue tracker.
>
> **Public-copy note (2026-10-05):** this copy defaults to an Anthropic API key (`LLM_PROVIDER=api`). Entries that mention the Claude Max subscription record how the original private prototype was developed; here that path survives only as an opt-in for personal local experiments. See Anthropic's [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview) on authentication.

## How to use this

- **Before proposing a change of direction**, find the decision below. If its **revisit-trigger has
  not fired**, the decision stands — build on it, don't reopen it. If it *has* fired, reopen it
  deliberately (add a dated sub-entry to the relevant ADR; don't rewrite history).
- **New decision?** Append a row here. **Architectural?** Also write a numbered ADR in `docs/adr/`.
  A reversible call just gets a row (or a `/retro` AAR line) — not every decision needs an ADR.
- Decisions marked **[USER CALL]** were made explicitly by the owner — extra weight; don't silently override.
- The **full narrative** (Context / Options / Decision / Why for every D1–D12, plus the appendix of
  deliberately-deferred work) lives in an archived long-form decision log (not included); the
  architectural ones are also in `docs/adr/`.

## Decision index (D1–D26)

> **D18 detail (2026-05-31, #24).** Tried Kokoro.js (on-device neural TTS) for a warmer read-aloud
> voice; **reverted to Web Speech** on the owner's call. **Why:** live audit (`instrument-and-verify-live`)
> measured narration synth at **~8 s/beat** in the real app (clean idle re-read: 7974 ms for a 12-word
> line; under build load 4–22 s). **Root cause:** the app is **not cross-origin-isolated**
> (`crossOriginIsolated=false`, no `SharedArrayBuffer`), so `onnxruntime-web` WASM runs **single-threaded**.
> A Web Worker (which **does** bundle cleanly in Next 16 / Turbopack via `new Worker(new URL(...))`)
> removed UI jank but **not** the latency — threading, not the thread, was the bottleneck. The
> **pre-cached instant warm ack did work** (0 ms, warm). **Honesty note / learning L11:** the earlier
> "keystone proven" commit and an earlier version of this D18 row cited spike numbers
> (312/4216/271/903 ms) that were **committed without being captured live** — the spike drive failed
> during a context-refresh glitch and the coding agent wrote the hoped-for figures as if measured (caught and corrected the same day). That false ~903 ms
> baseline is exactly why the real ~8 s looked like a mystery regression. Kept: `app/spike-kokoro/`
> (now corrected to honest numbers in the issue); engine + worker impl preserved in the original repo's history.
> Warm voice → **issue #26** (needs cross-origin isolation, with its own keystone). Mobile → #25.

| # | Decision | ADR | Status | Revisit when… |
|---|---|---|---|---|
| D1 | Web app (not native) | — | **Locked (v0)** | Web core proven AND a tablet-distribution need is real (Phase 3) |
| D2 | Target ages 8–12 | — | **Locked** | Validated demand pulls toward a different band |
| D3 | Text + tap-chips first, voice as fast-follow | — | **Locked (v0)** | Core loop proven; entering Phase 1 |
| D4 | **Agent SDK on the Max subscription** as the v0 engine **[USER CALL]** | [0001](../adr/0001-agent-sdk-on-max-subscription.md) | **Locked (v0), proven** | Serving real end-users (→ split-loop prod AI) OR billing model changes |
| D5 | Convex as the single backend + realtime transport | [0002](../adr/0002-convex-as-realtime-store.md) | **Locked** | A hard need Convex can't meet (heavy relational/analytics, self-host mandate) |
| D6 | iframe `srcdoc` (Tier A) + Sandpack (Tier B) for preview | [0003](../adr/0003-iframe-srcdoc-sandpack-preview.md) | **Locked (v0)** | A kid app genuinely needs a server/DB/npm (→ cloud sandbox, Phase 2) |
| D7 | No auth in v0; Phase-1 = Clerk with kids-as-profiles | [0004](../adr/0004-no-auth-anon-workspace-v0.md) | **Locked (v0)** | About to expose to anyone but the owner |
| D8 | The Max-subscription billing model + its ToS/metering guardrails | (in [0001](../adr/0001-agent-sdk-on-max-subscription.md)) | **Locked, proven** | June 15 2026 metering bites OR ToS/precedence changes |
| D9 | A small set of sharp custom tools (6 at v0; 7 since `offer_new_app`), written in Claude Code's "house style" | — | **Locked (v0)** | A capability genuinely can't be expressed as a sharp tool |
| D10 | One realtime transport (Convex) for chat **and** preview | (in [0002](../adr/0002-convex-as-realtime-store.md)) | **Locked** | Same trigger as D5 |
| D11 | `serverExternalPackages` to keep the Agent SDK out of the Next bundle | — | **Locked (impl)** | Next/Turbopack changes how it bundles native deps |
| D12 | Model routing: Haiku / Sonnet / Opus by role (`fast`/`balanced`/`deep`) | — | **Locked** | Credit drain or quality data argues for re-tiering |
| D13 | **Micro-choice feedback = queue / next-turn** (not live mid-build injection) **[USER CALL]** | [0005](../adr/0005-micro-choice-feedback-queue-next-turn.md) | **Locked (v0)** | Builds get long enough that next-turn latency hurts the "while-you-wait" feel, AND we're on the prod (API) engine where streaming-input steering is cheap/proven |
| D14 | Local doc-search tooling for recall/ingest. *Query the search tool directly* — the **`/recall` command was retired 2026-06-06** (unused: 0 invocations vs the search tool used 245×; see **D22**); ingest stays structural | — | **Amended → D22** | the search tool's read/write surface changes, or multi-repo coordination appears |
| D15 | **Voice in v0 — read-aloud + push-to-talk STT, on-device / $0** **[USER CALL]** | [0006](../adr/0006-voice-in-v0-read-aloud-and-push-to-talk.md) | **Locked (v0)** | Before exposing voice to **any real kid** → ADR 0006 §Deferred (parental consent, biometric, on-device STT) MUST be satisfied |
| D16 | **Rive (`.riv` state machine) as Sparky's avatar engine** | [0007](../adr/0007-rive-avatar-engine.md) | **Locked (v0), keystone proven** | Rive licensing changes, OR a usable `.riv` only obtainable at disproportionate cost (→ Lottie fallback) |
| D17 | **Idea-refinement = summoned grill + "Making-It Card" (build-first, ratify-second); grill off-by-default** **[USER CALL]** | — (issues #20/#21; `docs/research/sparky-comes-alive.md`) | **Decided, build next** | Build shows the card can't be made truthful, or the summoned-not-default model tests poorly with kids |
| D18 | **Kokoro.js warm read-aloud — EVALUATED & REVERTED; Web-Speech retained** **[USER CALL]** | [0006](../adr/0006-voice-in-v0-read-aloud-and-push-to-talk.md) §Voice | **Reverted (v0)** | Warm voice retried only with cross-origin isolation (COOP/COEP → threaded WASM) **proven not to break the srcdoc preview / Convex** → issue #26 |
| D19 | **File version history** (append-only `fileVersions` snapshot inside the write choke point; non-destructive rollback) **+ a dev-only `/admin` console** (source / diff / rollback), gated by `NODE_ENV` | [0008](../adr/0008-file-versioning-and-dev-admin-console.md) | **Locked (v0), verified live** | Storage matters at scale (Phase 2 → cap/prune/delta) OR the **kid-facing** time machine ships (Phase 1) |
| D20 | **Turn-grouped history — READ-SIDE**: group `fileVersions` by `turnMessageId`; reconstruct whole-project-as-of-turn via a pure fold → `compose()`; non-destructive **whole-turn rollback** through the write choke point. Adopt git's *model*, not its *machinery* — **no persisted commit tables at v0** (DB ~150 KB; measured 21 rows, 7 turn-stamped / 5 turns). + **Shiki** Source + **side-by-side diff** (over installed `diff@9`) in `/admin` | [0009](../adr/0009-turn-grouped-history-read-side.md) | **Accepted (v0)** | Read-side grouping proven valuable AND real scale/access-pattern pain → persist commits (#33); OR kid-facing time machine ships (Phase 1) |
| D21 | **Project = app = a multi-file repo; workspace = the shelf** **[USER CALL]**: one app per project (files + subfolders via `path` + project-level turn-commits); workspace = a flat collection of projects; **new app = a new project** (kid-driven shelf now, agent-assist later); the agent names the app on `create_project`. Staged bridge off single-file → real React **via Sandpack**, gradual to keep the constrained-generation wedge. Substrate already supports it (path = folders, `compose` = multi-file). | [0010](../adr/0010-project-equals-app-multi-file-repo.md) | **Accepted (v0)** | React/Sandpack keystone proven → commit to the bridge; OR scale makes persisted commits (#33) pay; OR a real need for project *grouping* appears |
| D22 | **Doc-sync = a guard, not a generator** (resolves #14): issues + git + code are canonical for *done-state*; `ROADMAP` / `PROGRESS` / `INDEX` stay **human-authored views**; a read-only `scripts/check-doc-sync.mjs` (run at `/retro`, optional pre-push) catches drift instead of auto-rendering over hand-written synthesis. Supersedes the *generator* half of an earlier progress-sync design note (archived, not included); retires the unused `/recall` (D14). | — | **Locked (process)** | the ledgers become mechanical enough to safely auto-render, OR multi-repo coordination needs a real generator |
| D23 | **"Toy Arcade" design system** — cream paper + dot-grid, saturated toy palette (coral/aqua/sun/grape/lime/blush + -deep pairs), warm ink, hard offset "pressable toy" shadows, Baloo 2 display + Nunito body (next/font, self-hosted), bouncy springs. Tokens live ONLY in `app/globals.css` `@theme`; components use utilities (`btn-toy`, `card-sticker`, `vk-pop-in`) | — | **Accepted (v0)** | Kid-testing says it reads babyish/cool-wrong, or a brand pass replaces the palette (one-file swap) |
| D24 | **UI binds to machine state, never kid copy**: `buildStatus.state` (thinking\|building\|done\|error) written by route+tools; `lib/buildMood.ts` `useBuildLifecycle` owns mood + the watched-transition `finishCount` edge (confetti/fanfare consumers) + `elapsedS`. Regexing kid-facing phrases for lifecycle is banned. **Auto-heal channel**: `compose()` injects an error-catcher (postMessage out of the opaque-origin iframe) → PreviewPane snag banner → "Ask Sparky to fix it" queues a normal turn with the error text | — | **Accepted (v0)** | A richer status shape is needed (per-file progress, pct) → extend the union, or the Agent SDK exposes structured progress natively |
| D25 | **Research-corrected same-day (build→measure→learn):** (a) **contrast house rule** — dark-ink labels on ALL color fills (white fails WCAG on aqua/sun/lime; only passes coral/grape ≥18.66px bold); small pills = dark-on-tint; errors get their own hue (`tang` #ff9f45, never the primary-action coral); `sunken` #f5e9d3 for recessed surfaces. (b) **No mid-build project-hop nudge** — the shipped 25s "peek at your other apps" detour was REMOVED on the wait-time brief's evidence (attention residue both ways; protect the reveal/peak-end); replacement = Come-Back Ding (kid self-wanders → chime pulls them back), in epic #42 | — (briefs: `docs/research/wait-time-engagement.md`, `design-system-validation.md`) | **Accepted (v0)** | Kid-testing contradicts the lab research, or the wait-time v2 epic (#42) supersedes the interim BuildShow |
| D26 | **[USER CALL] Dream-It-Up mode — a summoned MULTI-question pre-build interview** (owner's rationale: kids won't know what to prompt, so Sparky should ask several follow-up questions and only build once they've answered or said they're done). **Amends D17/#21 for the dedicated flow**: the 1-question cap becomes a budget of **5** (`MAX_QUESTIONS`, server-enforced via `allowedTools` — only-ask below `MIN=2`, only-finish at MAX), and **free-text/voice answers are allowed as the secondary path** ("chips, never a typed interview" relaxed — kid typing was already a first-class surface; chips stay primary). Shape: grape door on the empty canvas (opt-in; build-by-default untouched) → deterministic opener (0 model) → Haiku fast-role turns, exactly one tool per turn (`ask_question` = echo-affirm reaction + ≤10-word question + 3-4 wildly-different chips; `finish_interview` = recap + builder buildBrief) → ⭐ plan card gate → compiled brief (model brief + verbatim Q&A) runs as a normal `/api/chat source:"interview"` build turn. Escapes everywhere: 🚀 build-now (skips the recap gate — never re-confirm after go), 🎲 surprise-me (Sparky picks and SAYS what it picked), ✏️ something-else, ✕ never-mind, `DONE_INTENT` regex on typed answers. New `briefs` table (status-guarded mutations close the tap-🚀-mid-question race); questions are ordinary avatar bubbles so read-aloud just works. Measured live: ~9s/question steady-state (Haiku TTFT ~7s, SDK init <0.5s; covered by instant ack + dots; early-break at the tool call saves ~3s) | `docs/research/dream-it-up-patterns.md` (6-agent research: industry convergence = opt-in trigger, 2-5 budget, options-first+custom+skip, one explicit go; ClarifyGPT +9.8pts; dialogic Expand +0.60 SD; 3-5 options > 2) | **Accepted (v0), verified live 2026-07-08** ("Ninja Cat Taco Blaster": 5-Q natural finish → change-something → ratified build with every choice in the app; "Glitter Unicorn Sticker Maker": build-now escape) | Kid-testing shows fatigue before 5 questions (drop MAX), or speculative next-question pregen (#46) changes the loop shape, or #21's auto-offer/divergence triggers land and need a different activation surface |

> _Roadmap change (2026-05-30) — inserted milestone **M4 "Sparky Comes Alive"** (avatar + voice + idea-refinement) as the **next** milestone; the prior M4/M5 (polish, DX/deploy) shifted to **M5/M6**. **[USER CALL]** — avatar+voice first; idea-refinement (#20/#21) finishes it next._

## Key learnings (L1–L14)

> Durable, hard-won facts from building v0 — cite these when a future session is tempted to re-derive
> them.

- **L1** — The current Agent SDK **does** bill the subscription with custom tools + streaming (zero API
  spend, via `CLAUDE_CODE_OAUTH_TOKEN`) — **proven 2026-05-30**. Supersedes an earlier prototype's April note
  that "the SDK forces API billing" (true-then, false-now).
- **L2** — The **1-hour prompt cache auto-engages** on the subscription path (no manual plumbing). Keep
  Sparky's persona/safety block static and front-loaded so it stays cached across turns.
- **L3** — `serverExternalPackages` is **required** to run the Agent SDK under Next.js, or the server
  build fails. Check this first if the SDK ever fails to resolve at build time.
- **L4** — The `ANTHROPIC_API_KEY` **auth-precedence footgun** is real and silent: a stray key outranks
  the OAuth token and bills the API with no error. Mitigation is code, not vigilance (`env-guard.ts`). Never `--bare`. Treat unexplained API spend as "a key leaked into the shell."
- **L5** — Claude Code's own public behaviour (its tool design, task lists with an `activeForm`, its
  ask-the-user-a-question pattern) was a valuable **design reference** — same engine. Steal the *shape*,
  write our own kid-facing words.
- **L6** — **"Latency is a feature"** is a *designed* mechanic, not a nice-to-have: every wait is a
  micro-choice that feeds the build (`start_micro_choice` + the `buildStatus` ticker). Don't hide latency
  with a spinner; *fill* it.
- **L7** — The safety model is **structural**, not just prompt-based: 7 sandboxed tools (no Bash/FS/net; built-ins off via `tools: []`),
  Convex-scoped writes, an opaque-origin iframe + strict CSP, then a centralized owned persona block + a
  cheap Haiku output-moderation pass. *Permissions constrain the action space; the persona constrains the
  content.* Never let a raw trace reach a kid.
- **L8** — The whole AI-builder category (Lovable / Replit / v0 / Bolt) handles mid-build input by
  **queuing it as the *next* turn**, not injecting it mid-stream; Cursor tried mid-run steering and
  retreated (it "degrades output"). **Cross-turn continuity** — a follow-up turn knowing the current files —
  is table-stakes everywhere (checkpoints / preserved context) and was the gap behind D13. Full survey:
  `docs/research/micro-choice-feedback-model.md`.
- **L9** — The screen can show a **false pass**: a coincidental-looking UI state can mask a path that
  never ran (once, a button was pink for the *wrong* reason, nearly passing a test whose action
  silently didn't register). Only backend ground-truth — server logs / Convex data / the dev-log file —
  confirms the right path executed. **Verify both layers**; the discipline lives in the
  `instrument-and-verify-live` skill.
- **L10** — **The agent can't respond instantly.** The Agent SDK can take *tens of seconds* to emit its
  first output (≈70s before the first file on a complex build). Anything needing immediate feedback
  (read-aloud, a reaction, a status) must be injected **client/route-side the moment the kid acts** — never
  wait on the model. Proof: read-aloud's route writes an **instant ack** the client reads in ~90ms, then the
  model's narration + "it's ready!" follow as *queued* beats (read every beat in order; a new turn's first
  beat jumps the queue — the engine was later hardened, see **L13**, so the API is now `speakBubble`/`markSpoken`,
  not the old `speak`/`speakQueued`). *Corollary for debugging perceptual/timing bugs:*
  **timestamp the trigger vs the effect and measure — don't reason from feel** (one debugging run burned ~4 wrong
  hypotheses before one `Date.now()` comparison exposed the 70s truth). Also: avatar v0 ships as a **CSS/SVG**
  panda, not Rive — Rive is the documented upgrade pending a `.riv` asset (ADR 0007).
- **L11** — **On-device ONNX (Kokoro / transformers.js / `onnxruntime-web`) is single-threaded unless the
  page is cross-origin-isolated.** Without `SharedArrayBuffer` (which needs `COOP: same-origin` +
  `COEP`), WASM inference runs on one core — Kokoro narration measured **~8 s/beat** here vs a hoped
  sub-second. A **Web Worker fixes UI jank but NOT latency** (the bottleneck is threading, not the
  thread). And COEP is **not free**: it forces every cross-origin subresource to opt in, which can break
  the `<iframe srcdoc>` preview, Convex's socket, and the kids' generated apps' external images — so
  cross-origin isolation is itself a keystone (#26), not a config tweak. *(Corollary, the harder lesson:
  the coding agent committed "keystone proven" spike numbers it never actually measured — the spike drive
  had failed during a context glitch and it wrote the hoped-for figures as fact. The live audit caught it. **A keystone isn't proven until a
  number is read off the running thing; if the measurement didn't happen, the commit must say so.**
  Reinforces L9: verify both layers, from ground truth, every time — including against the agent's own earlier claims.)*
- **L12** — **`convex/_generated` is committed (tracked) in this repo** — there is no ignore rule.
  `api.d.ts` enumerates the function *modules*, so adding a Convex module regenerates it; commit the
  regenerated types **with** the schema/function change that produced them, or a fresh checkout typechecks
  against a stale `api`. (`api.js` and `dataModel.d.ts` derive generically — they don't change per-table or
  per-function — so in practice only `api.d.ts` moves.) Corollary, proven in practice: for DB-effect
  features the **Convex MCP (`data` / `runOneoffQuery`) is a stronger backend X-ray than logs** — assert the
  row + the invariant directly (every snapshot/rollback here was verified against the table, not inferred
  from the screen — L9 in practice).
- **L13** — **Read-aloud's "reads it multiple times" was mostly MULTIPLE OPEN TABS; the "long delay" was
  model latency (L10 again), not a read bug.** Live `instrument-and-verify-live` across 1–3 real tabs: with
  ≥2 tabs open on the same project, *each* tab's AvatarChat auto-read every beat → echo / nondeterministic
  interrupts (a loser tab's utterance fired `onerror:"interrupted"`). Measured `finish→speak ≈ 0` and the
  ACK reads at `appearToSpeakMs:0`; the seconds-long visible gap is the model **streaming** the bubble, not
  read lag. Fix = three guarantees in `lib/voice/speak.ts`: (1) **once per bubble** via a **module-level**
  `spokenIds` set — a *per-component* ref doesn't survive React StrictMode's mount→unmount→remount or a
  project-switch remount; (2) **one FOREGROUND reader across tabs** via a **per-bubble Web Lock**
  (`navigator.locks.request("vbk-read-"+id, {ifAvailable:true})` — atomic, multi-project-safe). The lock
  alone is NOT enough: a hidden/background tab can *win* the lock yet Chrome **mutes its `speechSynthesis`**,
  silently swallowing the beat — that was the real "after a chip it didn't read (or read late)" bug
  (fixed in a follow-up to the first read-aloud hardening). So the **visible** tab claims the lock *immediately* while
  background tabs wait a **600 ms headstart** → a visible (audible) tab always wins when present; if every
  tab is hidden, a lone hidden tab still claims after the delay (never a permanent miss). (3) **in order**
  via an explicit FIFO that feeds Chrome **one utterance at a time**, advancing on `onend`/`onerror` so a
  failed piece never strands the queue. AvatarChat swapped the racy `firstLoad` flag for a **grace-window
  `createdAt` baseline** (a brand-new app's first beat is never swallowed; history never replays) and calls
  `stopSpeaking` on project switch. *Method notes:* `read_console_messages` is **per-tab**, which cleanly
  separates cross-tab dup from within-tab dup. **`onstart` firing ≠ audible** — a tab reports
  `visibilityState:"hidden"` (and may be muted) while still firing `onstart` (true under Chrome automation),
  so trusting `onstart` as proof of an *audible* read is a false-pass (L9 again, caught only when the user
  reported beats they never heard despite "verified" logs). The reader must land on a foreground tab. Caveat:
  the fix only applies once **every open tab runs the new code** — stale tabs on old code still race. New API:
  `speakBubble(id,text,{jump})` + `markSpoken(id)`; the manual 🔊 button still uses `speak(text)`.

- **L14** — **`__dirname` in `next.config.ts` is NOT the repo root (Next 16 transpiles the TS config
  before executing it).** Setting `turbopack: { root: __dirname }` rooted Turbopack somewhere wrong:
  `next dev` printed "Ready", then the first compile hung for minutes writing a giant filesystem cache
  and the process exited cleanly with no error — looked exactly like a dead server, actually a poisoned
  workspace root. Fix: `root: process.cwd()` (dev/build always run from the repo root) + `rm -rf .next`
  to purge the bad cache. Symptom signature for next time: "Ready in 300ms" → "Compiling / ..." forever
  → silent exit 0.

## Retros

Blameless AARs from `/retro` were kept in `docs/decisions/retros/` (not included in this export).
Architectural decisions surfaced in a retro were promoted to a numbered ADR here.
