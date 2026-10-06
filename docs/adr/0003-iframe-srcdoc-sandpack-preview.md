# ADR 0003 — Preview/sandbox: iframe `srcdoc` (Tier A) + Sandpack (Tier B)

> Index: `docs/decisions/LOG.md` (D6). Status: **Locked (v0).**

## Context

Kids' code must *run* in the preview, instantly and safely, ideally on the kid's own device ($0
execution, no server round-trip). Running arbitrary kid-authored code is the sharpest safety surface in
the product.

## Options considered

1. **Sandboxed `<iframe srcdoc>` (HTML/CSS/JS) + `@codesandbox/sandpack-react` (React).** Runs
   in-browser, $0 execution, Apache-2.0 / free commercial. The iframe uses `sandbox="allow-scripts allow-modals"`
   **without** `allow-same-origin` → opaque origin, no access to cookies/parent. Covers ~95% of kid apps.
2. **StackBlitz WebContainers.** Full Node-in-browser; but **commercial license**, a ~500-session/month
   cap, and **COOP/COEP headers that break embeds**. **Rejected.**
3. **Cloud sandboxes (E2B Firecracker / Modal).** Real server + DB + npm for "real app" mode; but adds
   cost, latency, and infra, and is a *bigger* safety surface than a device-local iframe. **Deferred to
   Phase 2** as an opt-in "real app" mode.

## Decision

**Tier A = sandboxed iframe `srcdoc`** (HTML/CSS/JS, the default), **Tier B = Sandpack** (React /
multi-file). **WebContainers rejected. Cloud sandboxes deferred to Phase 2.**

## Why

iframe + Sandpack run on the kid's device for free, with no cloud-VM attack surface, and a
no-`allow-same-origin` iframe is *safer for kids* than a networked sandbox — it's the security model that
best fits the audience (the safety story is **structural**, not just prompt-based: an opaque-origin iframe
can't reach cookies or the parent). WebContainers' license cost, session cap, and COOP/COEP
embed-breakage are disqualifying for an embedded kid-facing preview. Cloud sandboxes solve a problem
(server/DB/npm) that ~95% of kid apps don't have, so paying their cost/latency/safety price in v0 would
be premature. Never let a raw stack trace reach the iframe — errors are routed by audience; a trace
reaching a kid-rendered surface is itself a bug.

## Status & revisit-trigger

**Locked for v0.** Add cloud sandboxes (Phase 2) only when a real, recurring kid use-case genuinely needs
a backend/DB/npm. **Before any public launch**, self-host the Sandpack bundler and move the preview to a
**separate cookieless origin with strict CSP** (already noted in Phase 2). WebContainers stays rejected
unless its licensing/headers situation materially changes.
