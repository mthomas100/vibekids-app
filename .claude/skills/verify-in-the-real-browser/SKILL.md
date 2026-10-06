---
name: verify-in-the-real-browser
description: >
  Use before claiming any UI / preview / chat feature works in VibeKids. Typecheck-green is
  NOT done — VibeKids' whole value is "watch it build live in the browser." Drive the actual
  app (Chrome MCP or computer-use), do the kid's gesture, and confirm the preview renders and
  plays. Triggers on "verify", "is it working", finishing a component/tool/preview change.
user-invocable: true
allowed-tools: Read, Bash
---

# Verify in the real browser

"It typechecks" / "tests pass" ≠ "a kid can use it." VibeKids sells *watching it build live*.
Confirm the real thing before you say done.

## Pre-flight (the app needs two processes)
- `npm run dev` (Next.js) AND `npm run dev:backend` (`convex dev`) both running. The preview
  re-renders reactively from Convex's `files` table — no backend, no live build.
- If either isn't up, start it (background) before driving the browser.

## Drive it like a kid (use the Chrome MCP; fall back to computer-use)
1. Open the app, start a project, type a real kid prompt ("make me a calculator").
2. Watch Sparky **build**: messages stream, `buildStatus` ticks, files land, the sandboxed
   `<iframe srcdoc>` preview renders.
3. **Interact with the preview itself** — click the calculator's buttons; the artifact must
   actually *work*, not just paint. Tap a suggestion chip; confirm it extends the build.
4. Watch the console/network for errors the kid would never see but you must (the preview is
   `allow-scripts`, NO `allow-same-origin` — confirm that sandbox holds).

## Report what you SAW, not what you expect
State the exact prompt, what rendered, what you clicked, what happened. A screenshot beats a
sentence. If it broke, that's a /diagnose job — get a failing browser repro first.

## Gotchas
- Convex types live in `convex/_generated`; if the backend isn't running they go stale and the
  build "works" in types but not at runtime. Real browser catches this; typecheck doesn't.
- Never surface a raw error to the preview — kid-safety. If you see a stack trace reach the
  iframe, that itself is a bug to file.
