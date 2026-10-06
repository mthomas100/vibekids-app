# ADR 0004 — Auth: none in v0; Phase-1 = Clerk with kids as *profiles*, not credentials

> Index: `docs/decisions/LOG.md` (D7). Status: **Locked (v0).**

## Context

v0's job is to test whether the core magic is compelling. Auth + child-data handling is a large,
compliance-heavy subsystem (COPPA/AADC) with *no users to protect yet* in v0. But the eventual model must
be COPPA-clean from the start of Phase 1.

## Options considered

1. **No auth in v0** — anonymous local workspace keyed by a `workspaceId` in `localStorage`; defer all
   auth/consent.
2. **Build auth now** — Clerk + parent/teacher accounts + child profiles up front.
3. **Kids get their own credentials** (kid logins). **Rejected on principle** — the worst COPPA posture.

## Decision

**v0 has no auth** (anonymous local workspace). **Phase 1 adds Clerk where *only adults log in*
(parent/teacher); kids are *profiles under an adult account*, never credential-holders.**

## Why

Building auth/consent in v0 would burn time protecting users who don't exist yet, and would couple the
proof-of-concept to a heavy compliance subsystem before we know the idea works. The Phase-1 shape —
**adults authenticate, kids are profiles** — is deliberately the *cleanest COPPA posture*: verifiable
parental consent lives at the account boundary, kids never hold credentials or a direct data
relationship, and data-minimization / no-dark-patterns (AADC) are designed in rather than retrofitted.
Doing this now (v0) would be premature; doing it any later than Phase 1 (first real users) would be
reckless — so the line sits exactly at "about to expose it to anyone but the owner."

## Status & revisit-trigger

**Locked for v0.** Implement the Clerk/profiles model **before exposing the app to anyone but the owner.**
The kids-as-profiles decision is a principled COPPA stance — do not "simplify" it into kid logins later.
