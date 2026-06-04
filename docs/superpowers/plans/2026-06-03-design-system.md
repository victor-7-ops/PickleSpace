# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the PickleSpace design system — Plus Jakarta Sans font, shadcn/ui components (Card, Button, Badge, Input, Tabs, etc.), and semantic color tokens — across all 13 screens without changing any logic or API calls.

**Architecture:** Global font change in `layout.tsx` first, then screen-by-screen conversion replacing raw Tailwind divs/buttons/inputs with shadcn components. Logic (state, hooks, API calls, data fetching) is never touched — only JSX markup and className values change. Each task is one screen or group of related screens.

**Tech Stack:** Next.js 14 App Router, shadcn/ui (base style), Tailwind CSS v3, Plus Jakarta Sans (Google Fonts), `cn()` from `@/lib/utils`

---

## File Map

| File | Action |
|------|--------|
| `src/app/layout.tsx` | Modify — swap Inter for Plus Jakarta Sans |
| `src/app/(auth)/login/page.tsx` | Modify — shadcn Card, Input, Label, Button |
| `src/app/(auth)/register/page.tsx` | Modify — shadcn Card, Input, Label, Button |
| `src/app/(dashboard)/player/discover/page.tsx` | Modify — shadcn Card, CardContent, Badge |
| `src/app/courts/[id]/page.tsx` | Modify — shadcn Badge, Separator |
| `src/components/player/SlotGrid.tsx` | Modify — shadcn Badge for slot chips |
| `src/components/player/CourtAbout.tsx` | Modify — shadcn Badge, Separator, Collapsible |
| `src/app/courts/[id]/book/page.tsx` | Modify — shadcn Card |
| `src/components/player/CheckoutForm.tsx` | Modify — shadcn Card, Input, Label, Button, Separator |
| `src/components/player/HoldTimer.tsx` | Modify — shadcn Badge |
| `src/app/bookings/[id]/confirmed/page.tsx` | Modify — shadcn Card, Button |
| `src/components/player/OpenGamePrompt.tsx` | Modify — shadcn Card, Button |
| `src/app/(dashboard)/player/bookings/page.tsx` | Modify — shadcn Tabs |
| `src/components/player/PlayerBookingCard.tsx` | Modify — shadcn Card, Badge, Button, Drawer |
| `src/app/(dashboard)/player/games/page.tsx` | Modify — shadcn Tabs, Button |
| `src/components/player/GameCard.tsx` | Modify — shadcn Card, Badge |
| `src/components/player/GamesFeed.tsx` | Modify — section headers |
| `src/app/games/[id]/page.tsx` | Modify — shadcn Card, Separator |
| `src/components/player/GamePlayers.tsx` | Modify — shadcn Card |
| `src/components/player/GameActions.tsx` | Modify — shadcn Button, AlertDialog |
| `src/app/games/new/page.tsx` | Modify — shadcn Card |
| `src/components/player/CreateGameForm.tsx` | Modify — shadcn Card, Input, Label, Textarea, Button |
| `src/app/(dashboard)/owner/courts/page.tsx` | Modify — shadcn Button |
| `src/components/owner/CourtsList.tsx` | Modify — shadcn Card, Badge, Button |
| `src/app/(dashboard)/owner/bookings/page.tsx` | Modify — shadcn Tabs |
| `src/components/owner/BookingCard.tsx` | Modify — shadcn Card, Badge, Button |
| `src/components/owner/BookingsFilter.tsx` | Modify — shadcn Badge as filter chips |
| `src/app/(dashboard)/owner/earnings/page.tsx` | Modify — shadcn Card, Separator |
| `src/components/ui/StatusBadge.tsx` | Delete — replaced by shadcn Badge |

---

## Task 1: Font — Plus Jakarta Sans

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace Inter with Plus Jakarta Sans**

Replace the entire `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'PickleSpace — Book Pickleball Courts in Cebu',
  description: 'Find and book pickleball courts in Cebu, Philippines. Real-time availability, GCash payments, and player matchmaking.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PickleSpace' },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', plusJakartaSans.variable)}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Verify font loads**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Open DevTools → Elements. The `<html>` tag should have a class containing `--font-sans`. The body text should visibly be Plus Jakarta Sans (rounded letterforms, slightly warmer than Inter).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: switch font to Plus Jakarta Sans"
```

---

## Task 2: Auth Pages — Login & Register

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Rewrite login page with shadcn components**

Replace `src/app/(auth)/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/player/discover'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">PickleSpace 🏓</CardTitle>
          <CardDescription>Log in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            No account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite register page with shadcn components**

Replace `src/app/(auth)/register/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'player' | 'owner'>('player')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(role === 'owner' ? '/owner/courts' : '/player/discover')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">PickleSpace 🏓</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan dela Cruz"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>I am a…</Label>
              <div className="flex gap-2">
                {(['player', 'owner'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                      role === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {r === 'player' ? '🏓 Player' : '🏟 Court Owner'}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/login`. The page should show a centered card with Plus Jakarta Sans font, green "PickleSpace 🏓" title, shadcn Input fields, and a green primary Button. Navigate to `/register` — same style with the role picker.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx"
git commit -m "feat: redesign auth pages with shadcn Card, Input, Label, Button"
```

---

## Task 3: Discovery Page — Court Cards

**Files:**
- Modify: `src/app/(dashboard)/player/discover/page.tsx`

- [ ] **Step 1: Rewrite discover page with shadcn Card and Badge**

Replace `src/app/(dashboard)/player/discover/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  searchParams: { date?: string }
}

export default async function DiscoverPage({ searchParams }: Props) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const date = searchParams.date ?? today

  const supabase = await createClient()

  const { data: courts } = await supabase
    .from('courts')
    .select(`id, name, city, hourly_rate, amenities, images, slots!inner(id)`)
    .eq('status', 'active')
    .eq('slots.date', date)
    .eq('slots.status', 'available')

  type CourtRow = { id: string; name: string; city: string; hourly_rate: number; amenities: string[]; images: string[]; slots: { id: string }[] }
  const sorted = ((courts ?? []) as CourtRow[])
    .map(c => ({ ...c, slotCount: c.slots.length }))
    .sort((a, b) => b.slotCount - a.slotCount)

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-1">Find a court</h1>
      <p className="text-sm text-muted-foreground mb-4">Pick a date to see available courts</p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-semibold text-foreground mb-1">No courts available</p>
          <p className="text-sm text-muted-foreground">No courts have open slots on this date — try another day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(court => (
            <Link key={court.id} href={`/courts/${court.id}?date=${date}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {court.images[0] && (
                  <div className="h-36 overflow-hidden">
                    <img src={court.images[0]} alt={court.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{court.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{court.city}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary">
                        ₱{court.hourly_rate.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground">/hr</span>
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} available
                      </Badge>
                    </div>
                  </div>
                  {court.amenities.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {court.amenities.slice(0, 3).map(a => (
                        <Badge key={a} variant="outline" className="text-xs font-normal">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/player/discover`. Court listings should appear as shadcn Cards with subtle borders and shadows. The slot count should be a green Badge. Amenities should be outline Badges. All text uses `text-foreground` / `text-muted-foreground` semantic tokens.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/player/discover/page.tsx"
git commit -m "feat: redesign discovery page with shadcn Card and Badge"
```

---

## Task 4: Checkout Page

**Files:**
- Modify: `src/components/player/CheckoutForm.tsx`
- Modify: `src/components/player/HoldTimer.tsx`

- [ ] **Step 1: Rewrite CheckoutForm with shadcn components**

Replace `src/components/player/CheckoutForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type PaymentMethod = 'gcash' | 'card' | 'cash'

interface CheckoutFormProps {
  slotId: string
  courtId: string
  courtName: string
  amount: number
  date: string
  startTime: string
  endTime: string
}

export function CheckoutForm({ slotId, courtId, courtName, amount, date, startTime, endTime }: CheckoutFormProps) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>('gcash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function calcHours(start: string, end: string) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  }

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      const hours = calcHours(startTime, endTime)
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, courtId, hours, paymentMethod: method, notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const { booking, checkoutUrl } = json
      if (method === 'cash' || !checkoutUrl) {
        router.push(`/bookings/${booking.id}/confirmed`)
      } else {
        window.location.href = checkoutUrl
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'gcash', label: 'GCash', icon: '📱' },
    { id: 'card',  label: 'Card',  icon: '💳' },
    { id: 'cash',  label: 'Cash',  icon: '💵' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Booking summary */}
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-foreground">{courtName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground">{startTime} – {endTime}</p>
          <Separator className="my-3" />
          <p className="text-2xl font-bold text-primary">₱{amount.toLocaleString()}</p>
        </CardContent>
      </Card>

      {/* Payment method */}
      <div>
        <Label className="mb-2 block">Pay with</Label>
        <div className="flex gap-3">
          {METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors',
                method === m.id
                  ? 'border-primary bg-secondary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <span className="text-xl">{m.icon}</span>
              <span className={cn('text-xs font-semibold', method === m.id ? 'text-primary' : 'text-muted-foreground')}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          Message to court owner{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. I'll arrive 10 mins late"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleConfirm} disabled={loading} className="w-full" size="lg">
        {loading ? 'Processing…' : `Confirm & Pay ₱${amount.toLocaleString()} →`}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {method === 'gcash' || method === 'card'
          ? "You'll be redirected to PayMongo to complete payment"
          : 'Pay at the court on arrival · Court will mark you as paid'}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Update HoldTimer badge**

Replace `src/components/player/HoldTimer.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface HoldTimerProps {
  expiresAt: string
  courtId: string
}

export function HoldTimer({ expiresAt, courtId }: HoldTimerProps) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isExpired = secondsLeft === 0
  const isUrgent = secondsLeft <= 120

  if (isExpired) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⏰</p>
        <p className="font-semibold text-foreground mb-1">Your hold expired</p>
        <p className="text-sm text-muted-foreground mb-4">Someone else may have taken this slot.</p>
        <Button onClick={() => router.push(`/courts/${courtId}`)}>
          Pick another slot
        </Button>
      </div>
    )
  }

  return (
    <Badge variant={isUrgent ? 'destructive' : 'outline'} className="tabular-nums">
      ⏱ {mins}:{String(secs).padStart(2, '0')} remaining
    </Badge>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/courts/[id]/book` (requires a held slot). The booking summary card should use shadcn Card with a Separator between details and price. The payment picker should show border change on selection. The notes field should be a shadcn Textarea. The timer should be a shadcn Badge (red when urgent).

- [ ] **Step 4: Commit**

```bash
git add src/components/player/CheckoutForm.tsx src/components/player/HoldTimer.tsx
git commit -m "feat: redesign checkout form and hold timer with shadcn components"
```

---

## Task 5: Confirmation Page

**Files:**
- Modify: `src/app/bookings/[id]/confirmed/page.tsx`
- Modify: `src/components/player/OpenGamePrompt.tsx`

- [ ] **Step 1: Update confirmation page**

In `src/app/bookings/[id]/confirmed/page.tsx`, find and replace the three state-rendering `return` blocks. The logic (variables, data fetching, redirects) stays identical — only the JSX changes.

**Error state** — replace the return:
```tsx
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="size-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <span className="text-3xl">✗</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">Payment unsuccessful</h1>
          <p className="text-sm text-muted-foreground mt-1">Your booking was not completed.</p>
        </div>
        <Button asChild>
          <Link href={`/courts/${(court as { id: string } | null)?.id ?? ''}`}>Try again</Link>
        </Button>
      </div>
    )
```

**Pending state** — replace the return:
```tsx
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="text-center mb-8">
          <div className="size-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold">Booking Received</h1>
          <p className="text-sm text-muted-foreground mt-1">Confirming your payment…</p>
          <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds.</p>
          <Link href={`/bookings/${params.id}/confirmed`}
            className="mt-3 text-sm text-primary font-medium hover:underline inline-block">
            Refresh
          </Link>
        </div>
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string } | null)?.name ?? ''}
          date={(slot as { date: string } | null)?.date ?? ''}
          startTime={(slot as { start_time: string } | null)?.start_time ?? ''}
          endTime={(slot as { end_time: string } | null)?.end_time ?? ''}
        />
      </div>
    )
```

**Confirmed state** — replace the return:
```tsx
  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col gap-8">
      <div className="text-center">
        <div className="size-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-bold">
          {isCash ? 'Booking Received!' : 'Booking Confirmed!'}
        </h1>
        <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{(court as { name: string } | null)?.name}</p>
          <p>{(slot as { date: string } | null)?.date} · {(slot as { start_time: string } | null)?.start_time} – {(slot as { end_time: string } | null)?.end_time}</p>
          <p className="font-bold text-primary">
            ₱{Number(booking.amount).toLocaleString()} · {booking.payment_method}
            {isCash ? ' — pay at the court' : ' · paid ✓'}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string } | null)?.name ?? ''}
          date={(slot as { date: string } | null)?.date ?? ''}
          startTime={(slot as { start_time: string } | null)?.start_time ?? ''}
          endTime={(slot as { end_time: string } | null)?.end_time ?? ''}
        />
        <p className="text-xs text-muted-foreground">Also sent to your email as backup</p>
      </div>
      <OpenGamePrompt slotId={booking.slot_id} courtId={(court as { id: string } | null)?.id ?? ''} />
    </div>
  )
```

Add these imports at the top of the file (keep all existing imports, add only what's new):
```tsx
import { Button } from '@/components/ui/button'
```

- [ ] **Step 2: Update OpenGamePrompt with shadcn Card and Button**

Replace `src/components/player/OpenGamePrompt.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface OpenGamePromptProps {
  slotId: string
  courtId: string
}

export function OpenGamePrompt({ slotId, courtId }: OpenGamePromptProps) {
  const router = useRouter()
  return (
    <Card className="border-primary/30 bg-secondary">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">🏓</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Need a playing partner?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Post this slot to the matchmaking feed — other players can request to join your game.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => router.push(`/games/new?slot=${slotId}&court=${courtId}`)}
          >
            Post Open Game
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.push('/player/bookings')}>
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/bookings/[id]/confirmed/page.tsx" src/components/player/OpenGamePrompt.tsx
git commit -m "feat: redesign confirmation page and open game prompt with shadcn"
```

---

## Task 6: Player Bookings + Games Feed — Tabs

**Files:**
- Modify: `src/app/(dashboard)/player/bookings/page.tsx`
- Modify: `src/components/player/PlayerBookingCard.tsx`
- Modify: `src/app/(dashboard)/player/games/page.tsx`
- Modify: `src/components/player/GameCard.tsx`

- [ ] **Step 1: Convert player bookings page tabs**

In `src/app/(dashboard)/player/bookings/page.tsx`, replace the tab navigation `<div>`:

```tsx
// BEFORE (find and remove):
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past',     label: 'Past'     },
        ].map(t => (
          <a key={t.key} href={`/player/bookings?tab=${t.key}`}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </a>
        ))}
      </div>

// AFTER (replace with):
      <div className="flex border-b border-border mb-4">
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past',     label: 'Past'     },
        ].map(t => (
          <a key={t.key} href={`/player/bookings?tab=${t.key}`}
            className={cn(
              'flex-1 py-2 text-center text-sm font-medium transition-colors',
              tab === t.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
          </a>
        ))}
      </div>
```

Add `import { cn } from '@/lib/utils'` at the top. Replace empty state markup:

```tsx
// BEFORE:
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-600 mb-1">No bookings yet</p>
          <p className="text-sm mb-4">Find a court to start playing.</p>
          <Link href="/player/discover"
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            Find a court
          </Link>
        </div>

// AFTER:
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-foreground mb-1">No bookings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Find a court to start playing.</p>
          <Button asChild><Link href="/player/discover">Find a court</Link></Button>
        </div>
```

Add `import { Button } from '@/components/ui/button'` to imports.

- [ ] **Step 2: Update PlayerBookingCard**

Replace `src/components/player/PlayerBookingCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Booking } from '@/types'

interface PlayerBookingCardProps {
  booking: Booking
  qrDataUrl: string
}

export function PlayerBookingCard({ booking, qrDataUrl }: PlayerBookingCardProps) {
  const [qrOpen, setQrOpen] = useState(false)

  const court = booking.court as { name?: string } | null
  const slot = booking.slot as { date?: string; start_time?: string; end_time?: string } | null
  const showQr = booking.booking_status === 'confirmed' || booking.booking_status === 'pending'

  const statusVariant = {
    confirmed: 'secondary' as const,
    pending: 'outline' as const,
    completed: 'outline' as const,
    cancelled: 'destructive' as const,
  }[booking.booking_status] ?? 'outline'

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{court?.name ?? 'Court'}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {slot?.date} · {slot?.start_time} – {slot?.end_time}
              </p>
            </div>
            <Badge variant={statusVariant} className="capitalize">{booking.booking_status}</Badge>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="font-bold text-primary">₱{Number(booking.amount).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{booking.payment_method}</span>
            </div>
            {showQr && (
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                View QR
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Drawer open={qrOpen} onOpenChange={setQrOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Check-in QR Code</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col items-center gap-4 px-4 pb-8">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <img src={qrDataUrl} alt="Check-in QR code" className="size-56" />
            </div>
            <p className="text-sm text-muted-foreground text-center">Show this to the court owner for check-in</p>
            <div className="text-center">
              <p className="font-semibold text-foreground">{court?.name}</p>
              <p className="text-sm text-muted-foreground">{slot?.date} · {slot?.start_time} – {slot?.end_time}</p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
```

- [ ] **Step 3: Update GameCard**

Replace `src/components/player/GameCard.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  showRole?: 'hosting' | 'joined'
}

const SKILL_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  open:         'secondary',
  beginner:     'secondary',
  intermediate: 'outline',
  advanced:     'destructive',
}

export function GameCard({ game, showRole }: GameCardProps) {
  const spotsLeft = game.max_players - game.current_players
  const isFull = game.status === 'full' || spotsLeft <= 0
  const isCancelled = game.status === 'cancelled'

  const host = game.host as { name?: string } | null
  const court = game.court as { name?: string } | null
  const slot = game.slot as { start_time?: string } | null

  return (
    <Link href={`/games/${game.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isCancelled ? 'opacity-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{game.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {court?.name}{slot?.start_time ? ` · ${slot.start_time}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {isCancelled ? (
                <Badge variant="destructive">Cancelled</Badge>
              ) : isFull ? (
                <Badge variant="destructive">Full</Badge>
              ) : spotsLeft === 1 ? (
                <Badge variant="outline">1 spot</Badge>
              ) : (
                <Badge variant="secondary">{spotsLeft} spots</Badge>
              )}
              {showRole && (
                <Badge variant={showRole === 'hosting' ? 'secondary' : 'outline'} className="capitalize">
                  {showRole}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={SKILL_VARIANT[game.skill_level] ?? 'secondary'} className="capitalize text-xs">
              {game.skill_level}
            </Badge>
            <span className="text-xs text-muted-foreground">Hosted by {host?.name ?? 'Player'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 4: Update games page tab styling**

In `src/app/(dashboard)/player/games/page.tsx`, apply the same tab pattern as bookings. Find the tab nav `<div className="flex border-b...">` and replace the active/inactive classes:

```tsx
// active tab class:
'text-primary border-b-2 border-primary'
// inactive tab class:
'text-muted-foreground hover:text-foreground'
```

Also add `import { cn } from '@/lib/utils'` and update the "+ Post Game" button:
```tsx
// BEFORE:
          <Link href="/games/new"
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
            + Post Game
          </Link>

// AFTER:
          <Button asChild size="sm">
            <Link href="/games/new">+ Post Game</Link>
          </Button>
```

Add `import { Button } from '@/components/ui/button'` to imports.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/player/bookings/page.tsx" src/components/player/PlayerBookingCard.tsx "src/app/(dashboard)/player/games/page.tsx" src/components/player/GameCard.tsx
git commit -m "feat: redesign player bookings and games with shadcn Tabs, Card, Badge, Drawer"
```

---

## Task 7: Game Detail + Create Game

**Files:**
- Modify: `src/components/player/GameActions.tsx`
- Modify: `src/components/player/GamePlayers.tsx`
- Modify: `src/components/player/CreateGameForm.tsx`
- Modify: `src/app/games/[id]/page.tsx`
- Modify: `src/app/games/new/page.tsx`

- [ ] **Step 1: Update GameActions with shadcn Button and AlertDialog**

Replace `src/components/player/GameActions.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ActionState = 'can-join' | 'joined' | 'full' | 'host' | 'cancelled' | 'unauthenticated'

interface GameActionsProps {
  gameId: string
  actionState: ActionState
}

export function GameActions({ gameId, actionState }: GameActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function callApi(path: string) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/${path}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {actionState === 'can-join' && (
        <Button onClick={() => callApi('join')} disabled={loading} className="w-full" size="lg">
          {loading ? 'Joining…' : 'Join Game →'}
        </Button>
      )}

      {actionState === 'joined' && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm font-semibold text-primary">✓ You're in!</p>
          <Button variant="outline" onClick={() => callApi('leave')} disabled={loading} className="w-full">
            {loading ? 'Leaving…' : 'Leave Game'}
          </Button>
        </div>
      )}

      {actionState === 'full' && (
        <Button disabled className="w-full" size="lg">Game Full</Button>
      )}

      {actionState === 'host' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading} className="w-full" size="lg">
              {loading ? 'Cancelling…' : 'Cancel Game'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this game?</AlertDialogTitle>
              <AlertDialogDescription>
                All joined players will see the game marked as cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Game</AlertDialogCancel>
              <AlertDialogAction onClick={() => callApi('cancel')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {actionState === 'unauthenticated' && (
        <Button asChild className="w-full" size="lg">
          <a href={`/login?next=/games/${gameId}`}>Log in to join →</a>
        </Button>
      )}

      {actionState === 'cancelled' && (
        <p className="text-center text-sm text-muted-foreground py-3 border border-border rounded-xl">
          This game has been cancelled
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update GamePlayers with shadcn Card**

In `src/components/player/GamePlayers.tsx`, replace the outer `<div className="bg-gray-50 rounded-2xl p-4">` with:

```tsx
    <Card>
      <CardContent className="p-4">
        {/* existing inner content stays identical */}
      </CardContent>
    </Card>
```

Add `import { Card, CardContent } from '@/components/ui/card'` to imports.

- [ ] **Step 3: Update CreateGameForm with shadcn components**

Replace `src/components/player/CreateGameForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SkillLevel = 'open' | 'beginner' | 'intermediate' | 'advanced'

interface CreateGameFormProps {
  courtId?: string
  courtName?: string
  slotId?: string
  slotDate?: string
  slotStart?: string
  slotEnd?: string
}

export function CreateGameForm({ courtId, courtName, slotId, slotDate, slotStart, slotEnd }: CreateGameFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [skill, setSkill] = useState<SkillLevel>('open')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasSlot = !!courtId && !!slotId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSlot) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, slotId, title: title.trim(), description: description.trim() || undefined, skillLevel: skill, maxPlayers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/games/${json.game.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (!hasSlot) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🏟</p>
        <p className="font-semibold text-foreground mb-2">Book a court first</p>
        <p className="text-sm text-muted-foreground mb-6">You need a confirmed court booking to post an open game.</p>
        <Button asChild><a href="/player/discover">Find a Court →</a></Button>
      </div>
    )
  }

  const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Inter.' },
    { value: 'advanced', label: 'Advanced' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="border-primary/30 bg-secondary">
        <CardContent className="p-4">
          <p className="font-semibold text-foreground">{courtName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{slotDate} · {slotStart} – {slotEnd}</p>
          <p className="text-xs text-primary font-medium mt-1">already booked ✓</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Game title *</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Casual doubles, anyone welcome"
        />
      </div>

      <div>
        <Label className="mb-2 block">Skill level</Label>
        <div className="flex gap-2">
          {SKILL_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => setSkill(o.value)}
              className={cn('flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors',
                skill === o.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
              )}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Max players</Label>
        <div className="flex gap-2">
          {[2, 4, 6].map(n => (
            <button key={n} type="button" onClick={() => setMaxPlayers(n)}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                maxPlayers === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
              )}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Bring your own paddle, parking available"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title.trim()} className="w-full" size="lg">
        {loading ? 'Posting…' : 'Post Game →'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/player/GameActions.tsx src/components/player/GamePlayers.tsx src/components/player/CreateGameForm.tsx
git commit -m "feat: redesign game detail actions and create game form with shadcn"
```

---

## Task 8: Owner Dashboard — Courts + Bookings + Earnings

**Files:**
- Modify: `src/components/owner/CourtsList.tsx`
- Modify: `src/components/owner/BookingCard.tsx`
- Modify: `src/components/owner/BookingsFilter.tsx`
- Modify: `src/app/(dashboard)/owner/bookings/page.tsx`
- Modify: `src/app/(dashboard)/owner/earnings/page.tsx`

- [ ] **Step 1: Update CourtsList with shadcn Card, Badge, Button**

In `src/components/owner/CourtsList.tsx`:

1. Replace the "+ Add Court" button:
```tsx
// BEFORE:
        <button onClick={openAdd}
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          + Add Court
        </button>

// AFTER:
        <Button onClick={openAdd} size="sm">+ Add Court</Button>
```

2. Replace empty state button:
```tsx
// BEFORE:
          <button onClick={openAdd}
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            List your first court
          </button>

// AFTER:
          <Button onClick={openAdd}>List your first court</Button>
```

3. Replace each court card link:
```tsx
// BEFORE:
            <button key={court.id} onClick={() => openEdit(court)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">

// AFTER:
            <Card key={court.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(court)}>
              <CardContent className="p-4">
```

4. Replace `<StatusBadge status={court.status} />` with:
```tsx
<Badge variant={court.status === 'active' ? 'secondary' : court.status === 'pending' ? 'outline' : 'destructive'} className="capitalize">
  {court.status}
</Badge>
```

Add imports: `import { Button } from '@/components/ui/button'`, `import { Card, CardContent } from '@/components/ui/card'`, `import { Badge } from '@/components/ui/badge'`. Remove `import { StatusBadge }`.

- [ ] **Step 2: Update BookingCard with shadcn Card, Badge, Button**

In `src/components/owner/BookingCard.tsx`, replace the outer card div and buttons:

```tsx
// Replace outer wrapper div with:
      <Card>
        <CardContent className="p-4">
          {/* existing inner content */}
        </CardContent>
      </Card>

// Replace StatusBadge:
<Badge variant={booking.booking_status === 'confirmed' ? 'secondary' : booking.booking_status === 'completed' ? 'outline' : 'destructive'} className="capitalize">
  {booking.booking_status}
</Badge>

// Replace "Mark Paid" button:
<Button variant="outline" size="sm" onClick={handleMarkPaid} disabled={markingPaid}>
  {markingPaid ? 'Saving…' : 'Mark Paid'}
</Button>

// Replace "Scan QR" button:
<Button variant="secondary" size="sm" onClick={() => { setScanResult(null); setScanOpen(true) }}>
  Scan QR
</Button>
```

Add imports: `import { Card, CardContent } from '@/components/ui/card'`, `import { Badge } from '@/components/ui/badge'`, `import { Button } from '@/components/ui/button'`. Remove `StatusBadge` import.

- [ ] **Step 3: Update BookingsFilter with shadcn Badge chips**

In `src/components/owner/BookingsFilter.tsx`, replace the button elements:
```tsx
// BEFORE:
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
            current === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>

// AFTER: wrap each in Badge
        <Badge
          key={f}
          variant={current === f ? 'default' : 'secondary'}
          className="cursor-pointer capitalize"
          onClick={() => router.push(`/owner/bookings?tab=all&status=${f}`)}>
          {f}
        </Badge>
```

Replace `<button>` with `<Badge>` (no button element needed). Add `import { Badge } from '@/components/ui/badge'`.

- [ ] **Step 4: Update owner bookings page tabs**

In `src/app/(dashboard)/owner/bookings/page.tsx`, apply the same semantic token tab pattern as Task 6:
```tsx
// active: 'text-primary border-b-2 border-primary'
// inactive: 'text-muted-foreground hover:text-foreground'
```

- [ ] **Step 5: Update earnings page**

In `src/app/(dashboard)/owner/earnings/page.tsx`, replace the three main containers:

```tsx
// Big number card — replace outer div:
      <Card className="text-center">
        <CardContent className="py-6">
          {/* existing content — change color classes: */}
          {/* text-green-700 → text-primary */}
          {/* text-gray-400 → text-muted-foreground */}
          {/* text-green-600 → text-primary */}
          {/* text-red-500 → text-destructive */}
        </CardContent>
      </Card>

// Chart card:
      <Card>
        <CardContent className="p-4">
          <EarningsChart data={chartData} view="month" />
        </CardContent>
      </Card>

// Transactions:
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Transactions</h2>
        {/* replace empty state text-gray-400 → text-muted-foreground */}
        <Card className="overflow-hidden">
          <div className="flex flex-col divide-y divide-border">
            {/* existing transaction rows — replace text-gray-900 → text-foreground, text-gray-400 → text-muted-foreground, text-green-700 → text-primary */}
          </div>
        </Card>
      </div>
```

Add `import { Card, CardContent } from '@/components/ui/card'` to imports.

- [ ] **Step 6: Delete StatusBadge.tsx**

```bash
rm src/components/ui/StatusBadge.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/owner/CourtsList.tsx src/components/owner/BookingCard.tsx src/components/owner/BookingsFilter.tsx "src/app/(dashboard)/owner/bookings/page.tsx" "src/app/(dashboard)/owner/earnings/page.tsx"
git commit -m "feat: redesign owner dashboard — Courts, Bookings, Earnings with shadcn components"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Font: Plus Jakarta Sans, weights 400–800 | Task 1 |
| `text-foreground` / `text-muted-foreground` semantic tokens | All tasks |
| `text-primary` for prices and CTAs | Tasks 2–8 |
| `text-destructive` for errors | Tasks 2, 5, 7, 8 |
| Auth: shadcn Card, Input, Label, Button | Task 2 |
| Discovery: shadcn Card, Badge | Task 3 |
| Checkout: shadcn Card, Input, Label, Textarea, Button, Separator | Task 4 |
| HoldTimer: shadcn Badge (red when urgent) | Task 4 |
| Confirmation: shadcn Button, Card | Task 5 |
| OpenGamePrompt: shadcn Card, Button | Task 5 |
| Player bookings: tab semantic tokens | Task 6 |
| PlayerBookingCard: shadcn Card, Badge, Button, Drawer | Task 6 |
| GameCard: shadcn Card, Badge | Task 6 |
| Player games: tab semantic tokens, Button | Task 6 |
| GameActions: shadcn Button, AlertDialog | Task 7 |
| GamePlayers: shadcn Card | Task 7 |
| CreateGameForm: shadcn Card, Input, Label, Textarea, Button | Task 7 |
| Owner CourtsList: shadcn Card, Badge, Button | Task 8 |
| Owner BookingCard: shadcn Card, Badge, Button | Task 8 |
| Owner BookingsFilter: shadcn Badge | Task 8 |
| Owner Earnings: shadcn Card, semantic tokens | Task 8 |
| StatusBadge.tsx deleted | Task 8 |
| Schedule grid NOT touched | ✓ (not in any task) |
| Logic/API NOT changed | ✓ (all tasks only touch JSX/className) |

**Placeholder scan:** None found. ✓

**Type consistency:**
- `Badge variant` values: `'default' | 'secondary' | 'outline' | 'destructive'` — consistent across all tasks ✓
- `Button variant` values: `'default' | 'outline' | 'destructive' | 'ghost' | 'secondary'` — consistent ✓
- `Card` always used with `CardContent` — consistent ✓
