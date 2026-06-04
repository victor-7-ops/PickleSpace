# PickleSpace Design System — Spec
**Date:** 2026-06-03
**Status:** Approved
**Project:** PickleSpace

---

## Overview

This spec defines the visual design system for PickleSpace and the screen-by-screen conversion plan from raw Tailwind markup to shadcn/ui components. The approach is surgical — theme upgrade is global (font + CSS tokens), component conversion is targeted per screen. Existing functionality is never touched.

**Decisions made:**
- **Vibe:** Friendly & Community — round corners, soft shadows, warm and approachable
- **Font:** Plus Jakarta Sans (Google Fonts) — slightly rounded letterforms, popular in SEA apps
- **Cards:** Subtle border + tiny shadow — `border + shadow-sm`, consistent with shadcn Card defaults

---

## Section 1: Typography

### Font Setup
- **Font:** Plus Jakarta Sans, loaded via `next/font/google`
- Variable: `--font-sans` (replaces Inter)
- Subsets: `['latin']`
- Weights to load: 400, 500, 600, 700, 800

### Type Scale

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 24–28px | 800 | Page titles, big numbers (earnings), greeting text |
| Heading | 16–20px | 700 | Section headers, card titles, court/game names |
| Body | 14px | 400–500 | Descriptions, content, form text |
| Caption | 12px | 500 | Labels, timestamps, meta info — `text-muted-foreground` |
| Micro | 11px | 600 | Badges, chips, filter tags |

### Rules
- Greeting text ("Hey Victor 👋") → Display, weight 700
- Court/game names → Heading, weight 600
- Prices (₱500/hr, ₱2,400) → weight 700, `text-primary` for positive amounts
- All-caps is **never used**
- Letter-spacing: -0.3px on Display, -0.2px on Heading, 0 on Body

---

## Section 2: Color Tokens

Tokens are already set in `src/app/globals.css`. This section defines their intended usage.

### Primary (`--primary` = green-600 #16a34a)
- CTA buttons ("Book →", "Join Game", "Post Game", "Confirm & Pay")
- Active tab underline indicators
- Active/selected filter chips
- Owner dashboard sticky header background
- Progress bars, hold timer

### Secondary (`--secondary` = green-50 tint)
- Inactive filter chips background
- Skill level badge backgrounds (Open, Beginner)
- Slot chip background ("available" state)
- Light accent areas

### Muted / Muted-foreground
- `bg-muted` → page background, section backgrounds
- `text-muted-foreground` → court city, timestamps, secondary labels, "(optional)" form hints

### Destructive
- Cancel game button
- Error states, error messages
- "Full" slot badge where appropriate

### Slot status colors (keep as custom, not shadcn tokens)
- Available → `bg-green-100 text-green-800`
- Held → `bg-yellow-100 text-yellow-800`
- Booked → `bg-blue-100 text-blue-800`

### Rules
- **Never use raw Tailwind color classes** (`bg-green-600`, `text-gray-500`) — always use semantic tokens (`bg-primary`, `text-muted-foreground`)
- Positive money amounts → `text-primary font-bold`
- Warning/negative → `text-destructive`
- Exception: slot status colors use raw Tailwind (no semantic equivalent)

---

## Section 3: Component Standards

### Buttons
| Use case | Component |
|----------|-----------|
| Primary CTA (Book, Join, Post, Confirm) | `<Button>` (default variant) |
| Destructive (Cancel Game, Delete) | `<Button variant="destructive">` |
| Secondary action (Skip, Back, Leave) | `<Button variant="outline">` |
| Ghost/icon-only | `<Button variant="ghost" size="icon">` |

Never use raw `<button className="bg-green-600...">` — always `<Button>`.

### Cards
| Use case | Component |
|----------|-----------|
| Court card, booking card, game card | `<Card>` + `<CardContent>` |
| Cards with title + description | `<Card>` + `<CardHeader>` + `<CardTitle>` + `<CardDescription>` + `<CardContent>` |
| Stats/earnings numbers | `<Card>` + `<CardContent>` with Display typography |
| Confirmation success card | `<Card>` + `<CardContent>` with green accent |

Never use raw `<div className="border rounded-xl p-4">` — always `<Card>`.

### Badges
| Use case | Variant |
|----------|---------|
| Slot status (Available, Booked) | `<Badge variant="secondary">` / `<Badge variant="outline">` |
| Skill level (Open, Beginner, Advanced) | `<Badge variant="outline">` |
| Role tag (Hosting — green) | `<Badge className="bg-green-100 text-green-800">` |
| Role tag (Joined — blue) | `<Badge className="bg-blue-100 text-blue-800">` |
| Spots remaining (2 spots — green, 1 spot — yellow, Full — red) | `<Badge>` with custom color class |

Never use raw `<span className="bg-green-100 text-green-800 rounded-full px-2">` — always `<Badge>`.

### Forms
- All text inputs → `<Input>` paired with `<Label>`
- All textareas → `<Textarea>` paired with `<Label>`
- Login, register, notes, court description, game title fields all converted

### Tabs
All two-tab patterns converted to shadcn `<Tabs>`:
- Today / All Bookings (owner bookings)
- Discover / My Games (player games)
- Upcoming / Past (player bookings)

Pattern:
```tsx
<Tabs defaultValue="today">
  <TabsList className="w-full">
    <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
    <TabsTrigger value="all" className="flex-1">All Bookings</TabsTrigger>
  </TabsList>
  <TabsContent value="today">...</TabsContent>
  <TabsContent value="all">...</TabsContent>
</Tabs>
```

### Modals & Sheets
| Use case | Component |
|----------|-----------|
| Cancel game confirmation | `<AlertDialog>` (replaces custom cancel sheet) |
| QR code full-screen view | `<Drawer>` (shadcn bottom sheet) |
| Add court / slot creation | Keep custom `<BottomSheet>` (no regression risk) |
| Game detail actions (join/leave) | `<Button>` inline, no modal needed |

### Separators
- Replace `<div className="border-t border-gray-100">` → `<Separator>`

### Skeletons
- Add `<Skeleton>` loading placeholders to court list, bookings list, games feed

---

## Section 4: Conversion Priority

### Priority 1 — Player-facing (highest impact)
1. `/login` + `/register` — first impression
2. `/player/discover` — most-visited screen
3. `/courts/[id]` — public court detail
4. `/courts/[id]/book` — checkout, payment trust moment
5. `/bookings/[id]/confirmed` — QR confirmation, emotional high point

### Priority 2 — Player ongoing
6. `/player/bookings` — booking history
7. `/player/games` — matchmaking feed
8. `/games/[id]` — game detail
9. `/games/new` — create game form

### Priority 3 — Owner dashboard
10. `/owner/courts`
11. `/owner/bookings`
12. `/owner/earnings`
13. `/owner/schedule` — lighter touch, custom grid stays

### What conversion means per screen
- `<div className="border rounded-xl p-4">` → `<Card>`
- `<button className="bg-green-600...">` → `<Button>`
- `<span className="bg-green-100...">` → `<Badge>`
- `<input className="border...">` → `<Input>` + `<Label>`
- Tab patterns → `<Tabs>` + `<TabsList>` + `<TabsTrigger>`
- Apply Plus Jakarta Sans font globally
- Apply `text-muted-foreground` for secondary text
- Add `<Skeleton>` loading states to lists

### Out of scope
- Logic, API, or data changes of any kind
- New features
- The weekly schedule grid (custom-built, leave as-is)
- Animation or micro-interaction work (post-design-system)

---

## Implementation Notes

- shadcn `cn()` utility is at `@/lib/utils` — use for all conditional classes
- Import components from `@/components/ui/[component]`
- `bottom-sheet.tsx` is the custom slide-up bottom sheet (renamed from `Sheet.tsx`)
- `sheet.tsx` is shadcn's side panel sheet
- `drawer.tsx` is shadcn's bottom drawer (use for QR full-screen)
- The `StatusBadge.tsx` custom component can be replaced with shadcn `<Badge>` variants
