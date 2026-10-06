<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Gotchas that bit us

- **One `next dev` per project dir** (Turbopack lock): a second `next dev` exits immediately ("Another
  next dev server is already running"). To read route/server logs without owning the terminal, grep
  `.next/dev/logs/next-development.log` — it captures BOTH server `console.log` and the browser console,
  as JSON lines.
- **The agent can't respond instantly.** The Agent SDK can take tens of seconds to emit its first output
  (~70s before the first file on a complex build). Anything needing immediate feedback (read-aloud, a
  reaction, a status) must be injected **client/route-side the moment the kid acts** — never block on the
  model. (See `docs/decisions/LOG.md` L10.)
- **On-device ML (`onnxruntime-web` / `transformers.js` / Kokoro) runs SINGLE-THREADED** unless the page
  is **cross-origin-isolated** (`COOP: same-origin` + `COEP` → `SharedArrayBuffer`). A **Web Worker fixes
  UI jank, NOT latency** (threading, not the thread, is the bottleneck). And **COEP can break the `<iframe
  srcdoc>` preview / Convex / generated-app images** — so isolation is a *keystone* (#26), not a config
  flip. Check `crossOriginIsolated` before trusting any in-browser ML latency. (Retro #24, LOG L11.)
