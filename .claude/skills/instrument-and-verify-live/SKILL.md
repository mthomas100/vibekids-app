---
name: instrument-and-verify-live
description: >
  Use at the CLOSE of building a feature/change in VibeKids — the final loop that proves it actually
  works in the running product, end to end, both layers. Instrument the front AND back end with
  tagged temporary logs for full observability, drive the real app via Claude-in-Chrome, then observe
  BOTH the kid-facing behavior and the under-the-hood logs together; conclude — if it works, strip the
  logs and commit; if not, fix and loop. Composes verify-in-the-real-browser for the driving. Triggers
  on reaching the verification phase of a build, "audit it live", "test it for real", "prove it works
  end to end", or finishing an agent-loop / tool / UI change.
user-invocable: true
---

# Instrument & verify live

Typecheck-green is not done; "it rendered" is not done either. **Done = you watched it work in the
real product AND the under-the-hood signal confirms the right thing happened — then you stripped the
scaffolding and committed.** This is a *loop*, not a single pass.

## The loop

### 1. Instrument — give yourself X-ray vision (both layers)
Add **temporary, tagged** logs so you can SEE what happens, front and back. Tag every one with a
greppable prefix (e.g. `[vbk:dbg]`) so stripping later is mechanical.
- **Backend** — `app/api/chat/route.ts` (the prompt sent, model, each SDK message / `tool_use` + its
  input, the queued / follow-up path taken, errors), `lib/ai/tools.ts` (each tool call + args + the
  Convex write), Convex fns (`console.log` shows in `convex dev` + the dashboard).
- **Frontend** — the components touched (`AvatarChat`, `SuggestionChips`, …): state transitions
  (`busy`, queued taps, chip picks), the Convex query values driving the UI.
- **Make the backend signal READABLE BY YOU** — terminal-only logs you can't see are useless:
  - Convex fn logs → `mcp__convex__logs` (the Convex MCP).
  - Next route logs → grep `.next/dev/logs/next-development.log` — Next 16 captures BOTH the server
    (`console.log` from the route) AND the browser console there, as JSON lines. Do NOT try to start a
    second `next dev` to capture stdout — **Next 16 enforces one dev server per project dir** and the
    second exits immediately. The running server's log file is readable even if the server isn't yours.

### 2. Drive it like a kid — Claude-in-Chrome
Use **verify-in-the-real-browser** for the mechanics (load the Chrome MCP via ToolSearch, open the
app, do the real gesture). Record a GIF for anything multi-step; capture frames before/after each act.

### 3. Observe BOTH layers, together
For the gesture you just did, line up what the kid SAW (screenshots / `read_page` / console + network
via the Chrome MCP) **against** what the logs say happened under the hood. The bug usually hides in the
gap between "looked fine on screen" and "the log shows it took the wrong path."

### 4. Conclude — did it work right?
State the pass criteria up front (what "right" means for THIS change). Then judge against what you
SAW + the logs, not what you hoped.
- **Worked** → **strip every `[vbk:dbg]` log** (`grep -rn '\[vbk:dbg\]'` → remove), re-verify it still
  works / typechecks, then **commit** (atomic, conventional subject).
- **Didn't** → diagnose from the logs (that's why you added them), fix, and **loop back to step 2**.
  If the signal was too thin to explain the failure, add more logs first.

### 5. Step back if it won't converge
If a few iterations don't close the gap, stop looping — zoom out, re-read the plan / ADR, or
`/request-human`. Grinding the same loop is the anti-pattern; a deliberate step back is not.

## Gotchas
- **Strip before you commit.** Shipping debug logs (especially anything that could reach a kid-facing
  surface) is a regression. The tag makes removal mechanical — use it. (Optionally keep a *small*,
  deliberate set of permanent structured logs if they earn their place; strip the noisy scaffolding.)
- Two processes must be up (`npm run dev` + `npm run dev:backend`); Convex types go stale if the
  backend is down (see `verify-in-the-real-browser`).
- Never let a raw log / trace reach the preview iframe — kid-safety. Backend logs stay backend.
- Don't conclude from one layer. "Preview looks right" + a backend error log = not done.
- **Driving via computer-use:** prefer chip / element-`ref` clicks over typing into a live React input
  mid-build — focus is flaky and a typed submit can silently not land. After typing, screenshot to
  confirm the text is in the field *before* you submit, or you'll chase a phantom result.
- **Perceptual / timing bugs ("does X happen fast enough / at the right moment?") — measure, don't
  reason.** Timestamp the trigger AND the effect (`Date.now()` at the gesture vs in the handler's log)
  and compare. One measurement beats four hypotheses: chasing read-aloud "lag" by reasoning burned ~4
  wrong fixes before a single timestamp comparison exposed a ~70s model latency (LOG L10).
- **If the user is using the app concurrently:** drive your OWN distinctively-named builds, **clear the
  console first**, and remember HMR can run a turn on code from a *previous* edit — reload before you
  measure, or the logs you read won't match the code you think is running.
