# Toy Arcade design-system validation (2026-07-08)

> Research agent's audit of the committed "Toy Arcade" tokens (D23) — palette confirmed as the
> right "Soft Arcade" direction; ONE real defect found (button-label contrast) plus role-hierarchy
> guidance and the five signature "whoa" moments.

## The one real bug: button-label contrast (WCAG)

Measured on the exact committed hexes:

| fill | white label | dark ink (#2a2340) label |
|---|---|---|
| coral `#ff5c5c` | 3.03 ⚠ (large+bold only) | 4.91 ✓ |
| grape `#a06bff` | 3.48 ⚠ | 4.28 ✓(large) |
| aqua `#21c7c1` | 2.10 ✗ | 7.08 ✓ |
| sun `#ffc233` | 1.61 ✗ | 9.21 ✓ |
| lime `#58cc02` | 2.09 ✗ | 7.12 ✓ |

Body ink on cream = 14.08 ✓. **House rule adopted (D25): dark-ink labels on ALL color fills** —
passes everywhere and reads more "sticker/toy." White reserved for hero CTAs on coral/grape at
≥18.66px bold only. The existing dark-on-light-tint pattern (LIVE badge: `text-aqua-deep` on
`bg-aqua/20`) is exactly right for small pills.

## Hierarchy & tokens

- **Color roles, or it's rainbow soup:** coral = primary action · aqua = secondary · sun =
  highlights/stars · grape = "Sparky magic" · lime = success/GO only. One primary per screen.
- **Errors get their own hue** — never overload coral (it's the primary CTA): tangerine
  `#ff9f45` / deep `#e07b22`, gentle, never fire-engine red. → token `tang`/`tang-deep`.
- **Sunken surface** for recessed things (input tracks, preview wells): warm `#f5e9d3` → token
  `sunken`. Surface stack: cream canvas → white card → sunken.
- Baloo 2 headings at 700/800 with slight letter-spacing (confident, not toddler).

## The 5 "whoa" moments (confetti colors = the token palette)

1. **"It's Alive!" reveal** — build finishes: preview pops with overshoot
   `cubic-bezier(0.34,1.56,0.64,1)`, ring pulse, confetti from its top edge, sticker-badge stamp,
   warm 3-note rising chime. (The arcade-console frame's power-on.)
2. **Instant Sparky reaction** — the moment the kid hits send (client-side, never blocking on the
   model): Sparky bounces "on it!", a building ribbon shimmers.
3. **Chips deal in like cards** — staggered ~60ms fan-in with slight rotation; hover lifts+wiggles.
4. **Everything is pressable** — every control sinks onto its hard `-deep` shadow on press
   (`translateY`, shadow→0) with springy pop-back. Highest-leverage, cheapest delight.
5. **Milestone sticker-seal** — rubber-stamp badge + radial confetti + chord, **gated to genuine
   firsts only** (first app / first run) so delight ≠ noise.

**Motion tokens:** standard 200ms `cubic-bezier(0.4,0,0.2,1)` · pop-in 300–400ms
`cubic-bezier(0.34,1.56,0.64,1)` · press 80ms down/spring back · celebration 500–700ms
`cubic-bezier(0.68,-0.6,0.32,1.6)` · honor `prefers-reduced-motion` (bounces→fades).

## Status of adoption

Contrast house rule + tang/sunken tokens applied 2026-07-08 (same-day fix commit). Moments 2/3/4
already shipped; moment 1 partially (confetti full-screen, not preview-anchored); moment 5 open.
