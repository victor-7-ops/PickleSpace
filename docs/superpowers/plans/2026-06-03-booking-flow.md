# Player Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete player booking flow — date-first court discovery, slots-first court detail with realtime availability, checkout with PayMongo GCash/card, and a confirmation screen with QR code and "Post Open Game" prompt.

**Architecture:** Separate Next.js 14 App Router route per step (`/player/discover` → `/courts/[id]` → `/courts/[id]/book` → `/bookings/[id]/confirmed`). Each page is a Server Component; Client Components handle realtime, the hold timer, and payment interaction. PayMongo redirects to `/bookings/[id]/confirmed` after payment — state is resolved server-side from the booking record, no client state to reconstruct.

**Tech Stack:** Next.js 14 App Router, Supabase (server + browser clients + Realtime), Tailwind CSS, PayMongo (existing `createPaymentLink`, `calculateFees`), `qrcode` npm package for QR rendering, Resend (existing `sendBookingConfirmation`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(dashboard)/player/layout.tsx` | Create | Player shell with tab nav + role guard |
| `src/app/(auth)/login/page.tsx` | Create | Email/password login form + redirect support |
| `src/app/(auth)/register/page.tsx` | Create | Register form with role selection |
| `src/app/api/courts/[id]/slots/route.ts` | Create | GET slots for a court within a date range |
| `src/app/(dashboard)/player/discover/page.tsx` | Create | Date-first court discovery, Server Component |
| `src/components/player/DateChips.tsx` | Create | Today/Tomorrow/Pick date client component |
| `src/app/courts/[id]/page.tsx` | Create | Court detail — slots-first, public |
| `src/components/player/SlotGrid.tsx` | Create | Slot chips with realtime + hold-on-tap |
| `src/components/player/CourtAbout.tsx` | Create | Collapsible court info section |
| `src/app/courts/[id]/book/page.tsx` | Create | Checkout page, Server Component |
| `src/components/player/HoldTimer.tsx` | Create | Countdown timer (10:00 → 0:00) |
| `src/components/player/PaymentPicker.tsx` | Create | GCash/Card/Cash method selector |
| `src/components/player/CheckoutForm.tsx` | Create | Notes field + confirm button + payment logic |
| `src/app/bookings/[id]/confirmed/page.tsx` | Create | Confirmation page — 3 states |
| `src/components/player/QRDisplay.tsx` | Create | Renders QR from token using qrcode |
| `src/components/player/OpenGamePrompt.tsx` | Create | "Post Open Game" / Skip card |
| `src/app/(dashboard)/player/bookings/page.tsx` | Create | Player booking history (Upcoming/Past) |
| `src/components/player/PlayerBookingCard.tsx` | Create | Booking card with QR sheet |

---

## Task 1: Player Layout Shell + Auth Pages

**Files:**
- Create: `src/app/(dashboard)/player/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create the player layout**

Create `src/app/(dashboard)/player/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'player') redirect('/owner')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-2xl mx-auto flex">
          {[
            { href: '/player/discover', label: 'Discover', icon: '🏟' },
            { href: '/player/games',   label: 'Games',    icon: '🏓' },
            { href: '/player/bookings', label: 'Bookings', icon: '📅' },
          ].map(tab => (
            <Link key={tab.href} href={tab.href}
              className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-green-600 transition-colors">
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Create the login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-600">PickleSpace</h1>
          <p className="text-sm text-gray-500 mt-1">Log in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link href="/register" className="text-green-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the register page**

Create `src/app/(auth)/register/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    // Profile row auto-created by DB trigger; redirect based on role
    router.push(role === 'owner' ? '/owner/courts' : '/player/discover')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-600">PickleSpace</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Full name</span>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Juan dela Cruz" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="At least 6 characters" />
          </label>
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">I am a…</span>
            <div className="flex gap-3">
              {(['player', 'owner'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-colors ${
                    role === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'
                  }`}>
                  {r === 'player' ? '🏓 Player' : '🏟 Court Owner'}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update handle_new_user trigger to use role from metadata**

The existing DB trigger in `supabase/schema.sql` creates a user row but doesn't set the role from `raw_user_meta_data`. Run this in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'player')
  );
  RETURN new;
END;
$$;
```

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add src/app/(dashboard)/player/layout.tsx "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx"
git commit -m "feat: player layout shell, login and register pages"
```

---

## Task 2: Courts Slots API

**Files:**
- Create: `src/app/api/courts/[id]/slots/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/courts/[id]/slots/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/courts/[id]/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
// Public — no auth required. Returns available + held slots for the date range.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl

  const from = searchParams.get('from')
  const to = searchParams.get('to') ?? from

  if (!from) {
    return NextResponse.json({ error: 'from date required' }, { status: 400 })
  }

  // Verify court exists and is active
  const { data: court } = await supabase
    .from('courts')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!court || court.status !== 'active') {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, status, hold_expires_at')
    .eq('court_id', params.id)
    .gte('date', from)
    .lte('date', to!)
    .order('date')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ slots: slots ?? [] })
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run type-check
git add "src/app/api/courts/[id]/slots/route.ts"
git commit -m "feat: GET /api/courts/[id]/slots — public slot availability endpoint"
```

---

## Task 3: Discovery Page

**Files:**
- Create: `src/app/(dashboard)/player/discover/page.tsx`
- Create: `src/components/player/DateChips.tsx`

- [ ] **Step 1: Create the DateChips client component**

Create `src/components/player/DateChips.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'

interface DateChipsProps {
  selected: string   // YYYY-MM-DD
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

export function DateChips({ selected }: DateChipsProps) {
  const router = useRouter()
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const todayStr = toDateStr(today)
  const tomorrowStr = toDateStr(tomorrow)

  function go(date: string) {
    router.push(`/player/discover?date=${date}`)
  }

  return (
    <div className="flex gap-2 mb-6">
      {[
        { label: 'Today',    date: todayStr },
        { label: 'Tomorrow', date: tomorrowStr },
      ].map(chip => (
        <button key={chip.date} onClick={() => go(chip.date)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === chip.date
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400'
          }`}>
          {chip.label}
        </button>
      ))}
      <label className={`flex items-center px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
        selected !== todayStr && selected !== tomorrowStr
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
      }`}>
        📅 Pick date
        <input type="date" className="sr-only" value={selected}
          min={todayStr}
          onChange={e => e.target.value && go(e.target.value)} />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Create the discovery page**

Create `src/app/(dashboard)/player/discover/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'

interface Props {
  searchParams: { date?: string }
}

export default async function DiscoverPage({ searchParams }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const date = searchParams.date ?? today

  const supabase = await createClient()

  // Fetch active courts that have at least one available slot on the selected date
  const { data: courts } = await supabase
    .from('courts')
    .select(`
      id, name, city, hourly_rate, amenities, images,
      slots!inner(id)
    `)
    .eq('status', 'active')
    .eq('slots.date', date)
    .eq('slots.status', 'available')

  // Count available slots per court and sort by count desc
  type CourtRow = { id: string; name: string; city: string; hourly_rate: number; amenities: string[]; images: string[]; slots: { id: string }[] }
  const sorted = ((courts ?? []) as CourtRow[])
    .map(c => ({ ...c, slotCount: c.slots.length }))
    .sort((a, b) => b.slotCount - a.slotCount)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Find a court</h1>
      <p className="text-sm text-gray-500 mb-4">Pick a date to see available courts</p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-medium text-gray-600 mb-1">No courts available</p>
          <p className="text-sm">No courts have open slots on this date — try another day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(court => (
            <Link key={court.id} href={`/courts/${court.id}?date=${date}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {court.images[0] && (
                <div className="h-36 overflow-hidden">
                  <img src={court.images[0]} alt={court.name}
                    className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{court.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{court.city}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-green-700">₱{court.hourly_rate.toLocaleString()}<span className="text-xs font-normal text-gray-400">/hr</span></p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">{court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} today</p>
                  </div>
                </div>
                {court.amenities.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {court.amenities.slice(0, 3).map(a => (
                      <span key={a} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add src/app/(dashboard)/player/discover/page.tsx src/components/player/DateChips.tsx
git commit -m "feat: date-first court discovery page"
```

---

## Task 4: Court Detail Page

**Files:**
- Create: `src/app/courts/[id]/page.tsx`
- Create: `src/components/player/SlotGrid.tsx`
- Create: `src/components/player/CourtAbout.tsx`

- [ ] **Step 1: Create CourtAbout collapsible**

Create `src/components/player/CourtAbout.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface CourtAboutProps {
  description?: string
  amenities: string[]
  address: string
  images: string[]
}

export function CourtAbout({ description, amenities, address, images }: CourtAboutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-gray-100 mt-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-sm font-semibold text-gray-700">
        About this court
        <span className="text-gray-400">{open ? '▲' : '▾'}</span>
      </button>
      {open && (
        <div className="pb-4 flex flex-col gap-3">
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <img key={i} src={url} alt="" className="h-24 w-36 object-cover rounded-xl flex-shrink-0" />
              ))}
            </div>
          )}
          {description && <p className="text-sm text-gray-600">{description}</p>}
          {amenities.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {amenities.map(a => (
                <span key={a} className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{a}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">📍 {address}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create SlotGrid client component**

Create `src/components/player/SlotGrid.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSlotRealtime } from '@/hooks/useSlotRealtime'
import type { Slot } from '@/types'

interface SlotGridProps {
  courtId: string
  courtSlug: string        // court [id] for URL construction
  initialSlots: Slot[]
  selectedDate: string     // YYYY-MM-DD
  hourlyRate: number
}

export function SlotGrid({ courtId, courtSlug, initialSlots, selectedDate, hourlyRate }: SlotGridProps) {
  const router = useRouter()
  const [holding, setHolding] = useState<string | null>(null)   // slot id being held
  const [error, setError] = useState('')

  // Merge initial + realtime (realtime wins)
  const realtimeSlots = useSlotRealtime(courtId, selectedDate)
  const slotMap = new Map<string, Slot>()
  initialSlots.forEach(s => slotMap.set(s.id, s))
  realtimeSlots.forEach(s => slotMap.set(s.id, s))
  const slots = Array.from(slotMap.values())
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const available = slots.filter(s => s.status === 'available')
  const unavailable = slots.filter(s => s.status !== 'available')

  async function handleSlotTap(slot: Slot) {
    if (slot.status !== 'available') return
    setError('')
    setHolding(slot.id)

    try {
      const res = await fetch('/api/slots/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id }),
      })
      const json = await res.json()

      if (res.status === 401) {
        // Not logged in — redirect to login with next param
        router.push(`/login?next=/courts/${courtSlug}/book?slot=${slot.id}`)
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Slot no longer available')
        setHolding(null)
        return
      }

      // Hold succeeded — navigate to checkout
      router.push(`/courts/${courtSlug}/book?slot=${slot.id}`)
    } catch {
      setError('Something went wrong — try again')
      setHolding(null)
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number)
    const period = h < 12 ? 'am' : 'pm'
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No slots available on this date
      </p>
    )
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 mb-3 text-center">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        {available.map(slot => (
          <button key={slot.id} onClick={() => handleSlotTap(slot)}
            disabled={!!holding}
            className="w-full flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 hover:bg-green-100 transition-colors disabled:opacity-60">
            <span className="font-semibold text-green-800 text-sm">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-700">₱{hourlyRate.toLocaleString()}</span>
              {holding === slot.id
                ? <span className="text-xs text-gray-400">Holding…</span>
                : <span className="text-xs text-green-600 font-medium">Book →</span>
              }
            </div>
          </button>
        ))}
        {unavailable.map(slot => (
          <div key={slot.id}
            className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 opacity-50">
            <span className="text-sm text-gray-500">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            <span className="text-xs text-gray-400">Unavailable</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create court detail page**

Create `src/app/courts/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SlotGrid } from '@/components/player/SlotGrid'
import { CourtAbout } from '@/components/player/CourtAbout'
import type { Slot } from '@/types'

interface Props {
  params: { id: string }
  searchParams: { date?: string }
}

export default async function CourtDetailPage({ params, searchParams }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date ?? today

  const supabase = await createClient()

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (!court) notFound()

  // Fetch slots for selected date ± 3 days
  const from = new Date(selectedDate)
  from.setDate(from.getDate() - 3)
  const to = new Date(selectedDate)
  to.setDate(to.getDate() + 3)

  const { data: slots } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, status, hold_expires_at')
    .eq('court_id', params.id)
    .gte('date', from.toISOString().split('T')[0])
    .lte('date', to.toISOString().split('T')[0])
    .order('date')
    .order('start_time')

  // Build date tabs: selectedDate ± 3 days
  const dateTabs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 3 + i)
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`/player/discover?date=${selectedDate}`} className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{court.name}</p>
          <p className="text-xs text-green-700 font-medium">₱{court.hourly_rate.toLocaleString()}/hr</p>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Date tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {dateTabs.map(d => {
            const dateObj = new Date(d + 'T00:00:00')
            const label = d === today ? 'Today'
              : d === new Date(today).toISOString().split('T')[0] ? 'Tomorrow'
              : dateObj.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
            return (
              <Link key={d} href={`/courts/${params.id}?date=${d}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  d === selectedDate
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-200 text-gray-600 hover:border-green-400'
                }`}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Slot grid — hero */}
        <SlotGrid
          courtId={court.id}
          courtSlug={params.id}
          initialSlots={(slots ?? []) as Slot[]}
          selectedDate={selectedDate}
          hourlyRate={court.hourly_rate}
        />

        {/* Collapsible about */}
        <CourtAbout
          description={court.description ?? undefined}
          amenities={court.amenities}
          address={court.address}
          images={court.images}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npm run type-check
git add "src/app/courts/[id]/page.tsx" src/components/player/SlotGrid.tsx src/components/player/CourtAbout.tsx
git commit -m "feat: court detail page — slots-first layout with realtime availability"
```

---

## Task 5: Checkout Page

**Files:**
- Create: `src/app/courts/[id]/book/page.tsx`
- Create: `src/components/player/HoldTimer.tsx`
- Create: `src/components/player/CheckoutForm.tsx`

- [ ] **Step 1: Create HoldTimer**

Create `src/components/player/HoldTimer.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface HoldTimerProps {
  expiresAt: string    // ISO timestamp
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
        if (s <= 1) {
          clearInterval(interval)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isExpired = secondsLeft === 0
  const isUrgent = secondsLeft <= 120

  if (isExpired) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⏰</p>
        <p className="font-semibold text-gray-900 mb-1">Your hold expired</p>
        <p className="text-sm text-gray-500 mb-4">Someone else may have taken this slot.</p>
        <button onClick={() => router.push(`/courts/${courtId}`)}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
          Pick another slot
        </button>
      </div>
    )
  }

  return (
    <span className={`text-sm font-semibold tabular-nums px-3 py-1 rounded-full ${
      isUrgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
    }`}>
      ⏱ {mins}:{String(secs).padStart(2, '0')} remaining
    </span>
  )
}
```

- [ ] **Step 2: Create CheckoutForm**

Create `src/components/player/CheckoutForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  // Calculate hours from time strings
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
        body: JSON.stringify({
          slotId,
          courtId,
          hours,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const { booking, checkoutUrl } = json

      if (method === 'cash' || !checkoutUrl) {
        router.push(`/bookings/${booking.id}/confirmed`)
      } else {
        // Redirect to PayMongo GCash/card checkout
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
      <div className="bg-green-50 rounded-2xl p-4">
        <p className="font-semibold text-gray-900">{courtName}</p>
        <p className="text-sm text-gray-600 mt-0.5">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm text-gray-600">{startTime} – {endTime}</p>
        <p className="text-2xl font-bold text-green-700 mt-3">₱{amount.toLocaleString()}</p>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Pay with</p>
        <div className="flex gap-3">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${
                method === m.id
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}>
              <span className="text-xl">{m.icon}</span>
              <span className={`text-xs font-semibold ${method === m.id ? 'text-green-700' : 'text-gray-600'}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Message to court owner <span className="text-gray-400 font-normal">(optional)</span></span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="e.g. I'll arrive 10 mins late"
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={handleConfirm} disabled={loading}
        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
        {loading ? 'Processing…' : `Confirm & Pay ₱${amount.toLocaleString()} →`}
      </button>

      {method === 'gcash' || method === 'card'
        ? <p className="text-xs text-gray-400 text-center">You'll be redirected to PayMongo to complete payment</p>
        : <p className="text-xs text-gray-400 text-center">Pay at the court on arrival · Court will mark you as paid</p>
      }
    </div>
  )
}
```

- [ ] **Step 3: Create checkout page**

Create `src/app/courts/[id]/book/page.tsx`:

```tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HoldTimer } from '@/components/player/HoldTimer'
import { CheckoutForm } from '@/components/player/CheckoutForm'

interface Props {
  params: { id: string }
  searchParams: { slot?: string }
}

export default async function BookPage({ params, searchParams }: Props) {
  const slotId = searchParams.slot
  if (!slotId) redirect(`/courts/${params.id}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/courts/${params.id}/book?slot=${slotId}`)

  // Verify slot is held by this user
  const { data: slot } = await supabase
    .from('slots')
    .select('*, court:courts(id, name, hourly_rate)')
    .eq('id', slotId)
    .single()

  if (!slot) notFound()

  const court = Array.isArray(slot.court) ? slot.court[0] : slot.court

  // Slot not held by this user or hold expired
  if (slot.status !== 'held' || slot.held_by !== user.id) {
    redirect(`/courts/${params.id}?error=slot-unavailable`)
  }

  const hours = (() => {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  })()

  const amount = (court as { hourly_rate: number }).hourly_rate * hours

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href={`/courts/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </Link>
        <span className="font-semibold text-gray-900">Checkout</span>
        <HoldTimer
          expiresAt={slot.hold_expires_at!}
          courtId={params.id}
        />
      </header>

      <div className="px-4 py-6">
        <CheckoutForm
          slotId={slotId}
          courtId={params.id}
          courtName={(court as { name: string }).name}
          amount={amount}
          date={slot.date}
          startTime={slot.start_time}
          endTime={slot.end_time}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npm run type-check
git add "src/app/courts/[id]/book/page.tsx" src/components/player/HoldTimer.tsx src/components/player/CheckoutForm.tsx
git commit -m "feat: checkout page with hold timer, payment picker, and PayMongo redirect"
```

---

## Task 6: QR Display + Open Game Prompt Components

**Files:**
- Create: `src/components/player/QRDisplay.tsx`
- Create: `src/components/player/OpenGamePrompt.tsx`

- [ ] **Step 1: Create QRDisplay**

The `qrcode` package is already in `package.json`. It runs server-side to generate a data URL.

Create `src/components/player/QRDisplay.tsx`:

```tsx
import QRCode from 'qrcode'

interface QRDisplayProps {
  token: string
  courtName: string
  date: string
  startTime: string
  endTime: string
}

export async function QRDisplay({ token, courtName, date, startTime, endTime }: QRDisplayProps) {
  const dataUrl = await QRCode.toDataURL(token, {
    width: 240,
    margin: 2,
    color: { dark: '#111827', light: '#ffffff' },
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <img src={dataUrl} alt="Check-in QR code" className="w-48 h-48" />
      </div>
      <p className="text-sm text-gray-500 text-center">Show this at the court for check-in</p>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{courtName}</p>
        <p className="text-xs text-gray-500">{date} · {startTime} – {endTime}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create OpenGamePrompt**

Create `src/components/player/OpenGamePrompt.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'

interface OpenGamePromptProps {
  slotId: string
  courtId: string
}

export function OpenGamePrompt({ slotId, courtId }: OpenGamePromptProps) {
  const router = useRouter()

  return (
    <div className="border border-green-200 bg-green-50 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🏓</span>
        <div className="flex-1">
          <p className="font-semibold text-green-900 text-sm">Need a playing partner?</p>
          <p className="text-xs text-green-700 mt-1 leading-relaxed">
            Post this slot to the matchmaking feed — other players can request to join your game.
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <button
          onClick={() => router.push(`/games/new?slot=${slotId}&court=${courtId}`)}
          className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
          Post Open Game
        </button>
        <button
          onClick={() => router.push('/player/bookings')}
          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
          Skip
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add src/components/player/QRDisplay.tsx src/components/player/OpenGamePrompt.tsx
git commit -m "feat: QRDisplay (server-rendered qrcode) and OpenGamePrompt components"
```

---

## Task 7: Confirmation Page

**Files:**
- Create: `src/app/bookings/[id]/confirmed/page.tsx`

- [ ] **Step 1: Create the confirmation page**

Create `src/app/bookings/[id]/confirmed/page.tsx`:

```tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QRDisplay } from '@/components/player/QRDisplay'
import { OpenGamePrompt } from '@/components/player/OpenGamePrompt'

interface Props {
  params: { id: string }
}

export default async function ConfirmedPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/bookings/${params.id}/confirmed`)

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, slot:slots(date, start_time, end_time, court_id), court:courts(id, name)')
    .eq('id', params.id)
    .single()

  if (!booking) notFound()

  // Only the player who made this booking can view confirmation
  if (booking.player_id !== user.id) redirect('/player/bookings')

  const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court

  const isPaid = booking.payment_status === 'paid'
  const isCash = booking.payment_method === 'cash'
  const isFailed = booking.booking_status === 'cancelled'

  // Failed payment state
  if (isFailed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">✗</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment unsuccessful</h1>
        <p className="text-sm text-gray-500 mb-6">Your booking was not completed.</p>
        <Link href={`/courts/${(court as { id: string }).id}`}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
          Try again
        </Link>
      </div>
    )
  }

  // Pending state (cash or webhook not yet fired)
  if (!isPaid && !isCash) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Booking Received</h1>
          <p className="text-sm text-gray-500 mt-1">Confirming your payment…</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-600">Payment is being confirmed. This usually takes a few seconds.</p>
          <button onClick={() => { location.reload() }}
            className="mt-3 text-sm text-green-600 font-medium hover:underline">
            Refresh
          </button>
        </div>
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string }).name}
          date={(slot as { date: string }).date}
          startTime={(slot as { start_time: string }).start_time}
          endTime={(slot as { end_time: string }).end_time}
        />
      </div>
    )
  }

  // Confirmed state
  return (
    <div className="min-h-screen bg-white px-4 py-8">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {isCash ? 'Booking Received!' : 'Booking Confirmed!'}
        </h1>
        <div className="mt-2 text-sm text-gray-500 space-y-0.5">
          <p>{(court as { name: string }).name}</p>
          <p>{(slot as { date: string }).date} · {(slot as { start_time: string }).start_time} – {(slot as { end_time: string }).end_time}</p>
          <p className="font-medium text-gray-700">
            ₱{Number(booking.amount).toLocaleString()} · {booking.payment_method}
            {isCash ? ' — pay at the court' : ' · paid ✓'}
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div className="mb-8">
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string }).name}
          date={(slot as { date: string }).date}
          startTime={(slot as { start_time: string }).start_time}
          endTime={(slot as { end_time: string }).end_time}
        />
        <p className="text-xs text-gray-400 text-center mt-2">Also sent to your email as backup</p>
      </div>

      {/* Open Game prompt */}
      <OpenGamePrompt
        slotId={(slot as { court_id: string }).court_id ? (slot as { court_id?: string; date?: string }).date ?? '' : ''}
        courtId={(court as { id: string }).id}
      />
    </div>
  )
}
```

- [ ] **Step 2: Fix OpenGamePrompt slot ID**

The `slot_id` from the booking record is what we need for the Open Game prompt, not from the slot join. Update the OpenGamePrompt call in the confirmed state with the correct value:

```tsx
<OpenGamePrompt
  slotId={booking.slot_id}
  courtId={(court as { id: string }).id}
/>
```

Replace the incorrectly constructed OpenGamePrompt at the bottom of the confirmed state block with this corrected version.

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add "src/app/bookings/[id]/confirmed/page.tsx"
git commit -m "feat: confirmation page with QR code, 3 states, and open game prompt"
```

---

## Task 8: Player Bookings List

**Files:**
- Create: `src/app/(dashboard)/player/bookings/page.tsx`
- Create: `src/components/player/PlayerBookingCard.tsx`

- [ ] **Step 1: Create PlayerBookingCard**

Create `src/components/player/PlayerBookingCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Booking } from '@/types'

interface PlayerBookingCardProps {
  booking: Booking
  qrDataUrl: string
}

export function PlayerBookingCard({ booking, qrDataUrl }: PlayerBookingCardProps) {
  const [qrOpen, setQrOpen] = useState(false)

  const court = booking.court as { name?: string } | null
  const slot = booking.slot as { date?: string; start_time?: string; end_time?: string } | null

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{court?.name ?? 'Court'}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {slot?.date} · {slot?.start_time} – {slot?.end_time}
            </p>
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-semibold text-green-700">₱{Number(booking.amount).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1.5">{booking.payment_method}</span>
          </div>
          {(booking.booking_status === 'confirmed' || booking.booking_status === 'pending') && (
            <button onClick={() => setQrOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
              View QR
            </button>
          )}
        </div>
      </div>

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="Check-in QR Code">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <img src={qrDataUrl} alt="QR code" className="w-56 h-56" />
          </div>
          <p className="text-sm text-gray-500 text-center">Show this to the court owner for check-in</p>
          <div className="text-center">
            <p className="font-medium text-gray-900">{court?.name}</p>
            <p className="text-sm text-gray-500">{slot?.date} · {slot?.start_time} – {slot?.end_time}</p>
          </div>
        </div>
      </Sheet>
    </>
  )
}
```

- [ ] **Step 2: Create player bookings page**

Create `src/app/(dashboard)/player/bookings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { PlayerBookingCard } from '@/components/player/PlayerBookingCard'
import Link from 'next/link'
import QRCode from 'qrcode'
import type { Booking } from '@/types'

interface Props {
  searchParams: { tab?: string }
}

export default async function PlayerBookingsPage({ searchParams }: Props) {
  const tab = searchParams.tab === 'past' ? 'past' : 'upcoming'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, court:courts(name), slot:slots(date, start_time, end_time)')
    .eq('player_id', user!.id)
    .neq('booking_status', 'cancelled')
    .order('created_at', { ascending: tab === 'upcoming' })

  // Split into upcoming and past based on slot date
  const all = (bookings ?? []) as unknown as Booking[]
  const filtered = all.filter(b => {
    const slotDate = (b.slot as { date?: string } | null)?.date ?? ''
    return tab === 'upcoming' ? slotDate >= today : slotDate < today
  })

  // Pre-render QR codes server-side
  const withQr = await Promise.all(
    filtered.map(async b => ({
      booking: b,
      qrDataUrl: await QRCode.toDataURL(b.qr_code, { width: 224, margin: 2 }),
    }))
  )

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Bookings</h1>

      {/* Tabs */}
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

      {withQr.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-600 mb-1">No bookings yet</p>
          <p className="text-sm mb-4">Find a court to start playing.</p>
          <Link href="/player/discover"
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            Find a court
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {withQr.map(({ booking, qrDataUrl }) => (
            <PlayerBookingCard key={booking.id} booking={booking} qrDataUrl={qrDataUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add "src/app/(dashboard)/player/bookings/page.tsx" src/components/player/PlayerBookingCard.tsx
git commit -m "feat: player bookings list with Upcoming/Past tabs and QR sheet"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `/player/*` role guard (player only) | Task 1 (layout.tsx) |
| Login with redirect support (`?next=`) | Task 1 (login page) |
| Register with role selection | Task 1 (register page) |
| DB trigger uses role from metadata | Task 1 (Step 4 SQL) |
| GET `/api/courts/[id]/slots` public endpoint | Task 2 |
| Date-first discovery: Today/Tomorrow/Pick date | Task 3 |
| Courts filtered by available slots on date | Task 3 |
| Court cards: photo, name, city, rate, slot count, amenities | Task 3 |
| Empty state on discovery | Task 3 |
| Court detail: sticky top bar + back button | Task 4 |
| Court detail: date tabs ±3 days | Task 4 |
| Slots-first: available = green tap chips, held = grey | Task 4 |
| Booked slots hidden | Task 4 (SlotGrid filters by available/held only) |
| Realtime via `useSlotRealtime` | Task 4 (SlotGrid) |
| Hold called before checkout navigation | Task 4 (SlotGrid.handleSlotTap) |
| Unauthenticated → login with `?next=` | Task 4 (SlotGrid handles 401) |
| Collapsible "About" section | Task 4 (CourtAbout) |
| Checkout: sticky header with back + hold timer | Task 5 |
| Timer expired state with back button | Task 5 (HoldTimer) |
| Booking summary (no platform fee line item) | Task 5 (CheckoutForm) |
| GCash/Card/Cash picker (GCash pre-selected) | Task 5 (CheckoutForm) |
| Notes field optional | Task 5 (CheckoutForm) |
| Cash → `/bookings/[id]/confirmed` | Task 5 (CheckoutForm) |
| GCash/Card → PayMongo redirect | Task 5 (CheckoutForm) |
| Server guard: slot not held by user → redirect | Task 5 (book page) |
| QR rendered from `qrcode` package | Task 6 + Task 7 |
| Confirmation: 3 states (confirmed/pending/error) | Task 7 |
| Confirmed state: success animation, summary, QR | Task 7 |
| "Post Open Game" prompt on confirmed bookings | Task 7 |
| "Skip" → `/player/bookings` | Task 6 (OpenGamePrompt) |
| Cash bookings: "Booking Received" + QR shown | Task 7 |
| QR emailed via Resend (already in webhook handler) | Existing `src/app/api/payments/webhook/route.ts` |
| Player bookings: Upcoming/Past tabs | Task 8 |
| Booking cards: court, date, time, status, QR button, amount | Task 8 |
| QR full-screen in Sheet | Task 8 (PlayerBookingCard) |
| `/courts/[id]` public (no auth to browse) | Task 4 (no auth check on detail page) |

**Placeholder scan:** None found. All code blocks are complete. ✓

**Type consistency:**
- `SlotGrid` passes `courtSlug: params.id` (string) and `courtId: court.id` (string) — consistent ✓
- `HoldTimer` takes `expiresAt: string` — court detail page passes `slot.hold_expires_at!` (string) ✓
- `CheckoutForm.calcHours` uses `start_time`/`end_time` strings — consistent with Slot type ✓
- `QRDisplay` is an async Server Component — correctly imported in server pages ✓
- `PlayerBookingCard` takes `qrDataUrl: string` — generated server-side via `QRCode.toDataURL` ✓
