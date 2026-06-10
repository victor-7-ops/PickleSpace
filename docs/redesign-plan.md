# PickleSpace Redesign Plan — "Game On"

**Direction:** Full visual overhaul, sporty & energetic.
**Replaces:** the current green-600 / Liquid Glass theme.
**Date:** 2026-06-10

## Design Concept

Pickleball's visual identity is the **optic-lime ball on a blue court**. The redesign leans
into that: high-energy lime as the signature accent, deep court navy as the anchor, white
courts of negative space. Bold condensed athletic type for headings, fast springy motion.
It should feel like stepping onto a court, not opening a SaaS dashboard.

## 1. Design Tokens (globals.css + tailwind.config.ts)

### Color system (HSL tokens, same shadcn variable names — zero component renames)

| Token | Light | Role |
|---|---|---|
| `--primary` | Court Navy `222 70% 22%` (#11225e-ish) | Buttons, nav active, headings accent |
| `--accent` | Optic Lime `72 95% 55%` (#cdee23-ish) | CTAs highlights, badges, live indicators, score moments |
| `--secondary` | Soft navy tint `222 60% 96%` | Chips, secondary buttons |
| `--background` | Off-white `220 20% 98%` | App background |
| `--destructive` | Hot coral `8 85% 57%` | Cancel/delete |
| `--ring` | Lime | Focus rings — high visibility |

- Dark mode: navy-black background (`222 47% 8%`), lime stays the accent, primary flips to lime-on-dark for CTAs. Verify 4.5:1 separately (lime on navy passes; lime on white does NOT — lime is never a text color on light surfaces, only fills behind navy text).
- Keep semantic token names so all existing `bg-primary` etc. classes restyle for free.
- Replace the green `brand` alias scale with `court` (navy scale) + `ball` (lime scale).
- Chart colors: navy → lime gradient steps for the earnings bars.

### Typography

- **Headings/display:** Barlow Condensed (600/700) — athletic, jersey-number energy. `--font-display`.
- **Body/UI:** Inter (keep) via `--font-sans`.
- Type scale: display numbers get `font-display uppercase tracking-tight`; prices and timers use `tabular-nums`.
- Load both via `next/font` with `display: swap`.

### Shape & effects

- Radius: `--radius: 1rem` for cards, but **buttons/chips go full-pill** (`rounded-full`) — sporty silhouette.
- Replace `.glass/.glass-heavy/.glass-primary` with solid, high-contrast surfaces + one new utility:
  - `.court-line` — 2px lime top-border accent strip (like a court boundary line) for section headers/cards.
  - `.elevation-1/2/3` — consistent navy-tinted shadow scale.
- Slot status colors: available = lime fill, held = amber pulse, booked = navy 20% (with icon, not color-only).

## 2. Core Components (src/components/ui)

1. **Button** — pill shape, navy fill primary, lime "power" variant for the single primary CTA per screen, scale-press feedback (0.97), 150ms.
2. **Card** — radius 1rem, elevation-1, optional `court-line` accent.
3. **Bottom nav** — solid navy bar (replaces frosted glass), lime active indicator pill that slides between tabs (layoutId spring), labels + Lucide icons stay.
4. **Badge/Chip** — pill, lime for "live/open", navy outline default.
5. **Slot grid cells** — bigger touch targets (min 44px), lime available state, springy select.
6. **Inputs** — 48px height, visible labels (already done), lime focus ring.
7. **Empty states** — add a simple SVG court illustration + action.

## 3. Screen-by-Screen Pass

Order = user-visible impact:

1. **Landing (`app/page.tsx`)** — hero with oversized Barlow Condensed headline ("FIND YOUR COURT."), lime CTA, court-line dividers.
2. **Auth (login/register)** — split brand panel (navy + lime), keep shake-on-error.
3. **Player discover (`/player/discover`)** — court cards: photo-forward, price chip in lime, distance/rating row, stagger-in (keep).
4. **Court detail + booking (`/courts/[id]`)** — sticky lime "Book" bar, redesigned slot grid, date pills.
5. **Checkout + confirmation** — confirmation gets a "W" celebration moment (lime burst, big condensed type, QR card).
6. **Games (`/player/games`, `/games/[id]`)** — scoreboard-style game cards: players-joined as avatar stack, skill level as jersey-number badge.
7. **Owner dashboard (4 tabs)** — navy header band, stat cards with condensed display numbers, earnings bars in navy→lime (CSS-only, per spec).
8. **Admin** — minimal restyle, tokens only.

## 4. Motion Pass (framer-motion, existing)

- Unify tokens: enter 250ms spring (stiffness 400, damping 30), exit ~150ms.
- Bottom-nav active pill: shared-layout spring.
- Slot select: scale pop. Booking success: one-shot lime radial burst (respect `prefers-reduced-motion`, already partly handled — verify globally with a `motion-safe` audit).
- Page transitions: directional slide (forward = from right), AnimatePresence already present.

## 5. QA Gate (before commit)

1. `npm run type-check` + `npm run lint` + `npm run build`
2. `web-design-guidelines` skill review pass
3. `wcag-accessibility-audit`: contrast (esp. lime pairings), focus order, reduced motion
4. Manual viewport check at 375px + dark mode toggle
5. PWA check: theme-color meta updated to navy, manifest icons still legible

## Non-Goals

- No backend/schema/API changes; no route changes
- No chart library (CSS bars stay, per spec)
- Earnings stays informational; booking RPC flow untouched

## Execution Order (commits)

1. `tokens:` color/type/radius/effects foundation
2. `components:` ui primitives + bottom nav
3. `screens:` landing + auth
4. `screens:` discover + court booking flow
5. `screens:` games + confirmation
6. `screens:` owner + admin
7. `motion:` unified motion tokens + transitions
8. `a11y:` audit fixes
