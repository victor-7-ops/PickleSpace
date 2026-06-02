# Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Court Owner Dashboard — a protected 4-tab PWA section where owners manage courts, schedule slots, view bookings with QR check-in, and track earnings.

**Architecture:** Separate Next.js App Router route per tab (`/owner/courts`, `/owner/schedule`, `/owner/bookings`, `/owner/earnings`) sharing a layout shell with a sticky stats header and tab nav. Server Components fetch data; Client Components handle interactivity and realtime. The `useSlotRealtime` hook already exists — use it in the schedule grid.

**Tech Stack:** Next.js 14 App Router, Supabase (server + browser clients), Tailwind CSS, BarcodeDetector Web API (QR scanning), Supabase Storage (court photos)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(dashboard)/owner/layout.tsx` | Create | Sticky header with live stats + tab nav, role guard |
| `src/app/(dashboard)/owner/page.tsx` | Create | Redirect to `/owner/courts` |
| `src/app/(dashboard)/owner/courts/page.tsx` | Create | Court listing, Server Component |
| `src/app/(dashboard)/owner/schedule/page.tsx` | Create | Schedule shell, Server Component |
| `src/app/(dashboard)/owner/bookings/page.tsx` | Create | Bookings with Today/All sub-tabs, Server Component |
| `src/app/(dashboard)/owner/earnings/page.tsx` | Create | Earnings summary + chart + transactions, Server Component |
| `src/app/api/courts/route.ts` | Create | GET owner's courts, POST new court |
| `src/app/api/courts/[id]/route.ts` | Create | PATCH update court, DELETE court |
| `src/app/api/slots/route.ts` | Create | POST bulk generate slots |
| `src/app/api/slots/[id]/route.ts` | Create | DELETE a slot |
| `src/app/api/bookings/[id]/checkin/route.ts` | Create | POST QR check-in validation |
| `src/app/api/bookings/[id]/mark-paid/route.ts` | Create | POST mark cash booking as paid |
| `src/components/ui/Sheet.tsx` | Create | Reusable slide-up bottom sheet |
| `src/components/ui/StatusBadge.tsx` | Create | Colored badge for court/booking status |
| `src/components/owner/CourtSheet.tsx` | Create | Multi-step add/edit court form |
| `src/components/owner/WeeklyGrid.tsx` | Create | 7-column slot grid, Client Component |
| `src/components/owner/SlotSheet.tsx` | Create | Create/view slot slide-up |
| `src/components/owner/GenerateWeekSheet.tsx` | Create | Bulk slot generation form |
| `src/components/owner/BookingCard.tsx` | Create | Booking card with QR scan + mark paid |
| `src/components/owner/QRScanner.tsx` | Create | Camera-based QR scanner |
| `src/components/owner/EarningsChart.tsx` | Create | CSS-only daily revenue bar chart |

---

## Task 1: Owner Layout Shell

**Files:**
- Create: `src/app/(dashboard)/owner/layout.tsx`
- Create: `src/app/(dashboard)/owner/page.tsx`

- [ ] **Step 1: Create the redirect page**

Create `src/app/(dashboard)/owner/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function OwnerPage() {
  redirect('/owner/courts')
}
```

- [ ] **Step 2: Fetch today's stats helper**

At the top of `src/app/(dashboard)/owner/layout.tsx`, add a server-side stats fetch. Create the file:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getOwnerStats(userId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', userId)

  const courtIds = (courts ?? []).map(c => c.id)

  if (courtIds.length === 0) return { bookingsToday: 0, revenueThisWeek: 0 }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { count: bookingsToday } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .in('court_id', courtIds)
    .eq('booking_status', 'confirmed')
    .filter('slot_id', 'in', `(select id from slots where date = '${today}')`)

  const { data: weekBookings } = await supabase
    .from('bookings')
    .select('amount')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', `${weekStartStr}T00:00:00`)

  const revenueThisWeek = (weekBookings ?? []).reduce((sum, b) => sum + Number(b.amount), 0)

  return { bookingsToday: bookingsToday ?? 0, revenueThisWeek }
}
```

- [ ] **Step 3: Add the layout shell with role guard and tab nav**

Append to `src/app/(dashboard)/owner/layout.tsx`:

```tsx
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/player')

  const stats = await getOwnerStats(user.id)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky stats header */}
      <header className="sticky top-0 z-40 bg-green-600 text-white shadow-md">
        <div className="px-4 pt-4 pb-2">
          <p className="font-semibold text-base">{greeting}, {profile.name.split(' ')[0]} 👋</p>
          <div className="flex gap-4 mt-1 text-sm text-green-100">
            <span>📅 {stats.bookingsToday} booking{stats.bookingsToday !== 1 ? 's' : ''} today</span>
            <span>💰 ₱{stats.revenueThisWeek.toLocaleString()} this week</span>
          </div>
        </div>
        {/* Tab bar */}
        <nav className="flex border-t border-green-500 mt-2">
          {[
            { href: '/owner/courts',   label: 'Courts'   },
            { href: '/owner/schedule', label: 'Schedule' },
            { href: '/owner/bookings', label: 'Bookings' },
            { href: '/owner/earnings', label: 'Earnings' },
          ].map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 py-2 text-center text-sm font-medium text-green-100 hover:text-white hover:bg-green-700 transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verify layout renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/owner/courts`. You should be redirected to `/login` (auth guard works). Log in as an owner — you should see the green header with greeting, stats (0 bookings, ₱0), and 4 tabs.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/owner/layout.tsx src/app/(dashboard)/owner/page.tsx
git commit -m "feat: owner dashboard layout shell with stats header and tab nav"
```

---

## Task 2: Reusable UI — Sheet + StatusBadge

**Files:**
- Create: `src/components/ui/Sheet.tsx`
- Create: `src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Create the Sheet component**

Create `src/components/ui/Sheet.tsx`:

```tsx
'use client'
import { useEffect } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {children}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add slide-up animation to Tailwind config**

Edit `tailwind.config.ts` — add the `animate-slide-up` keyframe:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Create StatusBadge**

Create `src/components/ui/StatusBadge.tsx`:

```tsx
type Status = 'active' | 'pending' | 'inactive' | 'confirmed' | 'cancelled' | 'completed' | 'available' | 'held' | 'booked'

const styles: Record<Status, string> = {
  active:    'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  booked:    'bg-blue-100 text-blue-800',
  pending:   'bg-yellow-100 text-yellow-800',
  held:      'bg-yellow-100 text-yellow-800',
  available: 'bg-gray-100 text-gray-700',
  inactive:  'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Sheet.tsx src/components/ui/StatusBadge.tsx tailwind.config.ts
git commit -m "feat: reusable Sheet and StatusBadge UI components"
```

---

## Task 3: Courts API Routes

**Files:**
- Create: `src/app/api/courts/route.ts`
- Create: `src/app/api/courts/[id]/route.ts`

- [ ] **Step 1: Create GET + POST courts route**

Create `src/app/api/courts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/courts — list the authenticated owner's courts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ courts: data })
}

// POST /api/courts — create a new court
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, address, city, province, hourly_rate, amenities } = body

  if (!name || !address || !hourly_rate) {
    return NextResponse.json({ error: 'name, address, and hourly_rate are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('courts')
    .insert({
      owner_id: user.id,
      name,
      description,
      address,
      city: city ?? 'Cebu City',
      province: province ?? 'Cebu',
      hourly_rate: Number(hourly_rate),
      amenities: amenities ?? [],
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ court: data }, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH + DELETE court route**

Create `src/app/api/courts/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/courts/[id] — update name, description, rate, amenities, images
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Verify ownership before update
  const { data: existing } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = ['name', 'description', 'address', 'city', 'province', 'hourly_rate', 'amenities', 'images']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  const { data, error } = await supabase
    .from('courts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ court: data })
}

// DELETE /api/courts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase.from('courts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify routes with curl**

```bash
# Should return 401 (not logged in)
curl -X GET http://localhost:3000/api/courts

# Should return 400 (missing fields)
curl -X POST http://localhost:3000/api/courts \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Court"}'
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/courts/
git commit -m "feat: courts API — GET/POST/PATCH/DELETE with ownership guard"
```

---

## Task 4: CourtSheet — Multi-Step Add/Edit Form

**Files:**
- Create: `src/components/owner/CourtSheet.tsx`

- [ ] **Step 1: Create the multi-step CourtSheet**

Create `src/components/owner/CourtSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'
import type { Court } from '@/types'

const AMENITY_OPTIONS = ['Parking', 'Shower', 'Night Lights', 'Restroom', 'Water Station']

interface CourtSheetProps {
  open: boolean
  onClose: () => void
  court?: Court   // if provided, edit mode
}

interface FormState {
  name: string
  address: string
  city: string
  description: string
  hourly_rate: string
  amenities: string[]
  images: File[]
}

const EMPTY: FormState = {
  name: '', address: '', city: 'Cebu City', description: '',
  hourly_rate: '', amenities: [], images: [],
}

export function CourtSheet({ open, onClose, court }: CourtSheetProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(
    court
      ? { name: court.name, address: court.address, city: court.city,
          description: court.description ?? '', hourly_rate: String(court.hourly_rate),
          amenities: court.amenities, images: [] }
      : EMPTY
  )

  function set(key: keyof FormState, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleAmenity(a: string) {
    set('amenities', form.amenities.includes(a)
      ? form.amenities.filter(x => x !== a)
      : [...form.amenities, a]
    )
  }

  async function uploadImages(courtId: string): Promise<string[]> {
    if (form.images.length === 0) return court?.images ?? []
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const urls: string[] = []
    for (const file of form.images) {
      const ext = file.name.split('.').pop()
      const path = `courts/${courtId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('court-images').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('court-images').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return [...(court?.images ?? []), ...urls]
  }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      const method = court ? 'PATCH' : 'POST'
      const url = court ? `/api/courts/${court.id}` : '/api/courts'

      // Create/update court first (without images)
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, address: form.address, city: form.city,
          description: form.description,
          hourly_rate: Number(form.hourly_rate),
          amenities: form.amenities,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Upload images and patch if any new ones
      const courtId = json.court.id
      if (form.images.length > 0) {
        const imageUrls = await uploadImages(courtId)
        await fetch(`/api/courts/${courtId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imageUrls }),
        })
      }

      router.refresh()
      onClose()
      setStep(0)
      setForm(EMPTY)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const STEPS = [
    {
      title: 'Basic Info',
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Court name *</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cebu Pickle Arena" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Address *</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">City</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.city} onChange={e => set('city', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe your court..." />
          </label>
        </div>
      ),
      valid: form.name.trim() !== '' && form.address.trim() !== '',
    },
    {
      title: 'Pricing',
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Hourly rate (₱) *</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
              <input type="number" min="0" className="border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="500" />
            </div>
          </label>
          <p className="text-xs text-gray-400">PickleSpace charges a 10% platform fee per booking. Players pay the full rate; you receive 90%.</p>
        </div>
      ),
      valid: Number(form.hourly_rate) > 0,
    },
    {
      title: 'Amenities',
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Select all that apply:</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button key={a} type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.amenities.includes(a)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-700 hover:border-green-400'
                }`}
              >{a}</button>
            ))}
          </div>
        </div>
      ),
      valid: true, // amenities optional
    },
    {
      title: 'Photos',
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Upload up to 6 photos of your court.</p>
          <input type="file" accept="image/*" multiple
            onChange={e => {
              const files = Array.from(e.target.files ?? []).slice(0, 6)
              set('images', files)
            }}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-sm" />
          {form.images.length > 0 && (
            <p className="text-xs text-gray-400">{form.images.length} file{form.images.length > 1 ? 's' : ''} selected</p>
          )}
          {court && court.images.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-1">
              {court.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>
      ),
      valid: true,
    },
  ]

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Sheet open={open} onClose={onClose} title={court ? 'Edit Court' : 'Add Court'}>
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-green-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <h3 className="font-medium text-gray-900 mb-4">{currentStep.title}</h3>
      {currentStep.content}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button
          disabled={!currentStep.valid || saving}
          onClick={isLast ? handleSubmit : () => setStep(s => s + 1)}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          {saving ? 'Saving...' : isLast ? (court ? 'Save Changes' : 'List Court') : 'Next →'}
        </button>
      </div>

      {!court && isLast && (
        <p className="mt-3 text-xs text-center text-gray-400">Your court will be reviewed and activated within 24 hours.</p>
      )}
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/owner/CourtSheet.tsx
git commit -m "feat: CourtSheet multi-step add/edit court form"
```

---

## Task 5: Courts Page

**Files:**
- Create: `src/app/(dashboard)/owner/courts/page.tsx`

- [ ] **Step 1: Create the courts listing page**

Create `src/app/(dashboard)/owner/courts/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { CourtsList } from '@/components/owner/CourtsList'

export default async function CourtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  return <CourtsList courts={courts ?? []} />
}
```

- [ ] **Step 2: Create CourtsList client component**

Create `src/components/owner/CourtsList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { CourtSheet } from './CourtSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Court } from '@/types'

export function CourtsList({ courts }: { courts: Court[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | undefined>()

  function openAdd() { setEditingCourt(undefined); setSheetOpen(true) }
  function openEdit(court: Court) { setEditingCourt(court); setSheetOpen(true) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">My Courts</h1>
        <button onClick={openAdd}
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          + Add Court
        </button>
      </div>

      {courts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-medium text-gray-600 mb-1">No courts yet</p>
          <p className="text-sm mb-4">List your first court and start accepting bookings.</p>
          <button onClick={openAdd}
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            List your first court
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courts.map(court => (
            <button key={court.id} onClick={() => openEdit(court)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-3">
                {court.images[0] && (
                  <img src={court.images[0]} alt={court.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{court.name}</p>
                    <StatusBadge status={court.status} />
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{court.address}</p>
                  <p className="text-sm font-medium text-green-700 mt-1">₱{court.hourly_rate.toLocaleString()}/hr</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CourtSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        court={editingCourt}
      />
    </>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/owner/courts`. You should see the empty state with "No courts yet." Click "Add Court" — the sheet should slide up with 4 steps. Fill in all steps and submit. The new court should appear in the list with a "pending" badge. Tap it — the sheet should open pre-filled for editing.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/owner/courts/page.tsx src/components/owner/CourtsList.tsx
git commit -m "feat: courts page with listing, add, and edit"
```

---

## Task 6: Slots API Routes

**Files:**
- Create: `src/app/api/slots/route.ts`
- Create: `src/app/api/slots/[id]/route.ts`

- [ ] **Step 1: Create bulk slot generation route**

Create `src/app/api/slots/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/slots — bulk generate slots for a week
// Body: { courtId, weekStart, openFrom, openUntil, durationHours, days }
// days: array of 0-6 (0=Sun, 1=Mon ... 6=Sat)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courtId, weekStart, openFrom, openUntil, durationHours, days } = await req.json()

  // Verify court ownership
  const { data: court } = await supabase
    .from('courts')
    .select('owner_id, hourly_rate')
    .eq('id', courtId)
    .single()

  if (!court || court.owner_id !== user.id) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  // Generate slot rows for each selected day
  const slots: { court_id: string; date: string; start_time: string; end_time: string }[] = []
  const startDate = new Date(weekStart)

  for (let d = 0; d < 7; d++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + d)
    if (!days.includes(day.getDay())) continue

    const dateStr = day.toISOString().split('T')[0]
    const [openH] = (openFrom as string).split(':').map(Number)
    const [closeH] = (openUntil as string).split(':').map(Number)

    for (let h = openH; h + durationHours <= closeH; h += durationHours) {
      const start = `${String(h).padStart(2, '0')}:00`
      const end = `${String(h + durationHours).padStart(2, '0')}:00`
      slots.push({ court_id: courtId, date: dateStr, start_time: start, end_time: end })
    }
  }

  if (slots.length === 0) {
    return NextResponse.json({ error: 'No slots generated — check your time range and selected days' }, { status: 400 })
  }

  // ON CONFLICT DO NOTHING — idempotent
  const { error } = await supabase
    .from('slots')
    .upsert(slots, { onConflict: 'court_id,date,start_time,end_time', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ generated: slots.length }, { status: 201 })
}
```

- [ ] **Step 2: Create delete slot route**

Create `src/app/api/slots/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/slots/[id] — only owner of the court can delete; only if status = available
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: slot } = await supabase
    .from('slots')
    .select('status, court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const court = Array.isArray(slot.court) ? slot.court[0] : slot.court
  if (court?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }
  if (slot.status !== 'available') {
    return NextResponse.json({ error: 'Cannot delete a held or booked slot' }, { status: 409 })
  }

  const { error } = await supabase.from('slots').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/slots/
git commit -m "feat: slots API — bulk generation (idempotent) and delete"
```

---

## Task 7: Schedule Components

**Files:**
- Create: `src/components/owner/WeeklyGrid.tsx`
- Create: `src/components/owner/SlotSheet.tsx`
- Create: `src/components/owner/GenerateWeekSheet.tsx`

- [ ] **Step 1: Create SlotSheet**

Create `src/components/owner/SlotSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'
import type { Slot, Booking } from '@/types'

interface SlotSheetProps {
  open: boolean
  onClose: () => void
  slot?: Slot | null              // existing slot (view/delete)
  newSlotDate?: string            // e.g. '2026-06-06'
  newSlotHour?: number            // e.g. 9 (for 9:00am)
  courtId: string
  defaultRate: number
  booking?: Booking | null        // if slot is booked, show booking info
}

export function SlotSheet({ open, onClose, slot, newSlotDate, newSlotHour, courtId, defaultRate, booking }: SlotSheetProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [startHour, setStartHour] = useState(newSlotHour ?? 6)
  const [endHour, setEndHour] = useState((newSlotHour ?? 6) + 1)

  const date = slot?.date ?? newSlotDate ?? ''
  const isReadOnly = slot && (slot.status === 'booked' || slot.status === 'held')
  const isExisting = !!slot

  async function handleCreate() {
    setError(''); setSaving(true)
    try {
      const start = `${String(startHour).padStart(2, '0')}:00`
      const end = `${String(endHour).padStart(2, '0')}:00`
      const res = await fetch('/api/slots/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, date, start_time: start, end_time: end }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating slot')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!slot) return
    setError(''); setSaving(true)
    try {
      const res = await fetch(`/api/slots/${slot.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error deleting slot')
    } finally { setSaving(false) }
  }

  const title = isReadOnly ? 'Booking Details' : isExisting ? 'Available Slot' : 'Create Slot'

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {isReadOnly && booking ? (
        <div className="flex flex-col gap-3">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-blue-900">{booking.player?.name ?? 'Player'}</p>
            <p className="text-sm text-blue-700 mt-1">{slot?.start_time} – {slot?.end_time}</p>
            <p className="text-sm text-blue-600 mt-1">Booking ID: {booking.id.slice(0, 8)}…</p>
          </div>
          {slot?.status === 'held' && (
            <p className="text-xs text-yellow-600 text-center">
              Hold expires at {new Date(slot.hold_expires_at!).toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : isExisting ? (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700">{date}</p>
            <p className="font-semibold text-green-900">{slot!.start_time} – {slot!.end_time}</p>
            <p className="text-sm text-green-700 mt-1">₱{defaultRate.toLocaleString()}/hr</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={handleDelete} disabled={saving}
            className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-40">
            {saving ? 'Deleting…' : 'Delete Slot'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">{date}</p>
          <div className="flex gap-3">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Start</span>
              <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </label>
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">End</span>
              <select value={endHour} onChange={e => setEndHour(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: 16 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={h} disabled={h <= startHour}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-400">Rate: ₱{defaultRate.toLocaleString()}/hr (from court default)</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={handleCreate} disabled={saving || endHour <= startHour}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-green-700">
            {saving ? 'Creating…' : 'Create Slot'}
          </button>
        </div>
      )}
    </Sheet>
  )
}
```

- [ ] **Step 2: Add single slot creation route (needed by SlotSheet)**

Create `src/app/api/slots/single/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/slots/single — create one slot
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courtId, date, start_time, end_time } = await req.json()

  const { data: court } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', courtId)
    .single()

  if (!court || court.owner_id !== user.id) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('slots')
    .insert({ court_id: courtId, date, start_time, end_time })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slot: data }, { status: 201 })
}
```

- [ ] **Step 3: Create GenerateWeekSheet**

Create `src/components/owner/GenerateWeekSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface GenerateWeekSheetProps {
  open: boolean
  onClose: () => void
  courtId: string
  weekStart: string   // ISO date of Monday
}

export function GenerateWeekSheet({ open, onClose, courtId, weekStart }: GenerateWeekSheetProps) {
  const router = useRouter()
  const [openFrom, setOpenFrom] = useState('06:00')
  const [openUntil, setOpenUntil] = useState('22:00')
  const [duration, setDuration] = useState(1)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]) // Mon-Sat default
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const slotCount = (() => {
    const [oh] = openFrom.split(':').map(Number)
    const [ch] = openUntil.split(':').map(Number)
    const slotsPerDay = Math.floor((ch - oh) / duration)
    return slotsPerDay * days.length
  })()

  async function handleGenerate() {
    setError(''); setResult(null); setSaving(true)
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, weekStart, openFrom, openUntil, durationHours: duration, days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(`Generated ${json.generated} slot${json.generated !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error generating slots')
    } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Generate Week">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Open from</span>
            <input type="time" value={openFrom} onChange={e => setOpenFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Until</span>
            <input type="time" value={openUntil} onChange={e => setOpenUntil(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">Slot duration</span>
          <div className="flex gap-2 mt-1">
            {[1, 2].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                  duration === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-700'
                }`}>
                {d} hr
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">Days</span>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className={`px-2.5 py-1 rounded-lg text-sm border transition-colors ${
                  days.includes(i) ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Will generate ~{slotCount} slots. Existing slots won't be overwritten.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700 font-medium">✓ {result}</p>}

        <button onClick={handleGenerate} disabled={saving || days.length === 0}
          className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-green-700">
          {saving ? 'Generating…' : `Generate ${slotCount} slots`}
        </button>
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 4: Create WeeklyGrid**

Create `src/components/owner/WeeklyGrid.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSlotRealtime } from '@/hooks/useSlotRealtime'
import { SlotSheet } from './SlotSheet'
import { GenerateWeekSheet } from './GenerateWeekSheet'
import type { Court, Slot, Booking } from '@/types'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am–9pm

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function mondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface WeeklyGridProps {
  court: Court
  initialSlots: Slot[]
  bookingsBySlotId: Record<string, Booking>
}

export function WeeklyGrid({ court, initialSlots, bookingsBySlotId }: WeeklyGridProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const weekDates = getWeekDates(weekStart)
  const today = new Date().toISOString().split('T')[0]

  // Realtime slot updates (uses the first visible date as a proxy — covers the week)
  const realtimeSlots = useSlotRealtime(court.id, weekDates[0].toISOString().split('T')[0])

  // Merge initial + realtime (realtime wins if present)
  const slotMap = new Map<string, Slot>()
  initialSlots.forEach(s => slotMap.set(`${s.date}-${s.start_time}`, s))
  realtimeSlots.forEach(s => slotMap.set(`${s.date}-${s.start_time}`, s))

  const [sheetSlot, setSheetSlot] = useState<Slot | null>(null)
  const [newCell, setNewCell] = useState<{ date: string; hour: number } | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  function cellColor(status: Slot['status'] | undefined) {
    if (!status) return 'bg-gray-50 border-gray-100 hover:bg-green-50 cursor-pointer'
    if (status === 'available') return 'bg-green-100 border-green-200 hover:bg-green-200 cursor-pointer'
    if (status === 'held')      return 'bg-yellow-100 border-yellow-200 cursor-pointer'
    if (status === 'booked')    return 'bg-blue-100 border-blue-200 cursor-pointer'
    return ''
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  const weekStartStr = weekDates[0].toISOString().split('T')[0]

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">◀</button>
          <span className="text-sm font-medium text-gray-700">
            {weekDates[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">▶</button>
        </div>
        <button onClick={() => setGenerateOpen(true)}
          className="text-xs font-semibold text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50">
          ⚡ Generate week
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />Held</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />Booked</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-px mb-1">
            <div /> {/* hour column */}
            {weekDates.map((d, i) => {
              const ds = d.toISOString().split('T')[0]
              return (
                <div key={i} className={`text-center text-xs font-medium py-1 ${ds === today ? 'text-green-700' : 'text-gray-500'}`}>
                  <div>{DAY_SHORT[d.getDay()]}</div>
                  <div className={ds === today ? 'font-bold text-green-700' : ''}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          <div className="flex flex-col gap-px">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-px">
                <div className="text-xs text-gray-400 pr-1 pt-1 text-right">
                  {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </div>
                {weekDates.map((d, di) => {
                  const dateStr = d.toISOString().split('T')[0]
                  const timeStr = `${String(hour).padStart(2, '0')}:00`
                  const slot = slotMap.get(`${dateStr}-${timeStr}`)
                  return (
                    <div
                      key={di}
                      onClick={() => {
                        if (slot) { setSheetSlot(slot); setNewCell(null) }
                        else { setNewCell({ date: dateStr, hour }); setSheetSlot(null) }
                      }}
                      className={`h-8 rounded border text-[10px] flex items-center justify-center transition-colors ${cellColor(slot?.status)}`}
                    >
                      {slot?.status === 'booked' && '✓'}
                      {slot?.status === 'held' && '…'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SlotSheet
        open={!!sheetSlot || !!newCell}
        onClose={() => { setSheetSlot(null); setNewCell(null) }}
        slot={sheetSlot}
        newSlotDate={newCell?.date}
        newSlotHour={newCell?.hour}
        courtId={court.id}
        defaultRate={court.hourly_rate}
        booking={sheetSlot ? bookingsBySlotId[sheetSlot.id] : null}
      />

      <GenerateWeekSheet
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        courtId={court.id}
        weekStart={weekStartStr}
      />
    </>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/owner/WeeklyGrid.tsx src/components/owner/SlotSheet.tsx \
        src/components/owner/GenerateWeekSheet.tsx src/app/api/slots/single/
git commit -m "feat: WeeklyGrid, SlotSheet, GenerateWeekSheet schedule components"
```

---

## Task 8: Schedule Page

**Files:**
- Create: `src/app/(dashboard)/owner/schedule/page.tsx`

- [ ] **Step 1: Create schedule page**

Create `src/app/(dashboard)/owner/schedule/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { WeeklyGrid } from '@/components/owner/WeeklyGrid'
import { redirect } from 'next/navigation'
import type { Booking } from '@/types'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at')

  if (!courts || courts.length === 0) {
    redirect('/owner/courts')
  }

  // For now, show the first court. Court selector is a future enhancement.
  const court = courts[0]

  // Fetch slots for the next 14 days
  const today = new Date().toISOString().split('T')[0]
  const twoWeeksLater = new Date()
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)
  const endDate = twoWeeksLater.toISOString().split('T')[0]

  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .eq('court_id', court.id)
    .gte('date', today)
    .lte('date', endDate)
    .order('date')
    .order('start_time')

  // Fetch bookings for booked/held slots to show player names
  const bookedSlotIds = (slots ?? [])
    .filter(s => s.status === 'booked')
    .map(s => s.id)

  let bookingsBySlotId: Record<string, Booking> = {}
  if (bookedSlotIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, player:users(name, phone)')
      .in('slot_id', bookedSlotIds)
      .eq('booking_status', 'confirmed')

    bookingsBySlotId = Object.fromEntries(
      (bookings ?? []).map(b => [b.slot_id, b])
    )
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">{court.name}</h1>
      <p className="text-sm text-gray-500 mb-4">Tap an empty cell to add a slot · tap a slot to view or delete</p>
      <WeeklyGrid
        court={court}
        initialSlots={slots ?? []}
        bookingsBySlotId={bookingsBySlotId}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/owner/schedule`. You should see the weekly grid with Mon–Sun columns and 6am–9pm rows. Tap an empty cell — SlotSheet should open. Create a slot — it should appear green in the grid. Tap it again — options to delete should appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/owner/schedule/page.tsx
git commit -m "feat: schedule page with weekly slot grid"
```

---

## Task 9: Check-in + Mark Paid API

**Files:**
- Create: `src/app/api/bookings/[id]/checkin/route.ts`
- Create: `src/app/api/bookings/[id]/mark-paid/route.ts`

- [ ] **Step 1: Create check-in route**

Create `src/app/api/bookings/[id]/checkin/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings/[id]/checkin  body: { qrCode: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { qrCode } = await req.json()
  if (!qrCode) return NextResponse.json({ error: 'qrCode required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, slot:slots(date), court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Verify the caller is the court owner
  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court
  if (court?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }

  // Validate QR token
  if (booking.qr_code !== qrCode) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
  }

  // Must be confirmed
  if (booking.booking_status !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot check in a booking with status: ${booking.booking_status}` },
      { status: 409 }
    )
  }

  // Must be today's slot
  const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
  if (slot?.date !== today) {
    return NextResponse.json({ error: 'This booking is not for today' }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ booking_status: 'completed' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: updated })
}
```

- [ ] **Step 2: Create mark-paid route**

Create `src/app/api/bookings/[id]/mark-paid/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings/[id]/mark-paid — for cash bookings: mark payment_status = 'paid'
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('payment_method, payment_status, court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court
  if (court?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }

  if (booking.payment_method !== 'cash') {
    return NextResponse.json({ error: 'Only cash bookings can be manually marked as paid' }, { status: 400 })
  }

  if (booking.payment_status === 'paid') {
    return NextResponse.json({ error: 'Already marked as paid' }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid', booking_status: 'confirmed' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: updated })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bookings/[id]/checkin/ src/app/api/bookings/[id]/mark-paid/
git commit -m "feat: booking checkin and mark-paid API routes"
```

---

## Task 10: QRScanner + BookingCard

**Files:**
- Create: `src/components/owner/QRScanner.tsx`
- Create: `src/components/owner/BookingCard.tsx`

- [ ] **Step 1: Create QRScanner**

Create `src/components/owner/QRScanner.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onResult: (code: string) => void
  onClose: () => void
}

export function QRScanner({ onResult, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let detector: BarcodeDetector | null = null
    let animFrame: number

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) videoRef.current.srcObject = stream

        if (!('BarcodeDetector' in window)) {
          setError('Camera scanning not supported on this browser. Enter the code manually below.')
          return
        }

        // @ts-expect-error BarcodeDetector not in TS lib yet
        detector = new BarcodeDetector({ formats: ['qr_code'] })

        async function scan() {
          if (!videoRef.current || !detector) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              onResult(codes[0].rawValue)
              return // stop scanning after first result
            }
          } catch {}
          animFrame = requestAnimationFrame(scan)
        }
        animFrame = requestAnimationFrame(scan)
      } catch {
        setError('Camera access denied. Enter the code manually below.')
      }
    }

    start()
    return () => {
      cancelAnimationFrame(animFrame)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [onResult])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-square max-w-xs mx-auto w-full">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {/* Scan overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white rounded-xl opacity-60" />
        </div>
      </div>

      {error && <p className="text-sm text-yellow-600 text-center">{error}</p>}

      <p className="text-xs text-gray-400 text-center">Or enter the QR code manually:</p>
      <div className="flex gap-2">
        <input value={manualCode} onChange={e => setManualCode(e.target.value)}
          placeholder="Paste booking QR code"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => manualCode && onResult(manualCode)}
          disabled={!manualCode}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40">
          Verify
        </button>
      </div>

      <button onClick={onClose} className="text-sm text-gray-400 text-center hover:text-gray-600">
        Cancel
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create BookingCard**

Create `src/components/owner/BookingCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { QRScanner } from './QRScanner'
import type { Booking } from '@/types'

export function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter()
  const [scanOpen, setScanOpen] = useState(false)
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)

  async function handleScanResult(code: string) {
    setScanOpen(false)
    const res = await fetch(`/api/bookings/${booking.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: code }),
    })
    const json = await res.json()
    if (res.ok) {
      setScanResult('success'); setScanMessage('Check-in successful!')
      router.refresh()
    } else {
      setScanResult('error'); setScanMessage(json.error ?? 'Check-in failed')
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true)
    const res = await fetch(`/api/bookings/${booking.id}/mark-paid`, { method: 'POST' })
    if (res.ok) router.refresh()
    setMarkingPaid(false)
  }

  const playerName = (booking.player as { name?: string })?.name ?? 'Player'
  const timeRange = `${booking.slot?.start_time ?? ''} – ${booking.slot?.end_time ?? ''}`
  const isCashUnpaid = booking.payment_method === 'cash' && booking.payment_status === 'unpaid'
  const isConfirmed = booking.booking_status === 'confirmed'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{playerName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{timeRange}</p>
            {'court' in booking && booking.court && (
              <p className="text-xs text-gray-400 mt-0.5">{(booking.court as { name: string }).name}</p>
            )}
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-semibold text-green-700">₱{Number(booking.amount).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1.5">
              {booking.payment_method} · {booking.payment_status}
            </span>
          </div>
          <div className="flex gap-2">
            {isCashUnpaid && (
              <button onClick={handleMarkPaid} disabled={markingPaid}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-40">
                {markingPaid ? 'Saving…' : 'Mark Paid'}
              </button>
            )}
            {isConfirmed && (
              <button onClick={() => { setScanResult(null); setScanOpen(true) }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                Scan QR
              </button>
            )}
          </div>
        </div>

        {scanResult && (
          <p className={`mt-2 text-xs font-medium ${scanResult === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {scanResult === 'success' ? '✓' : '✗'} {scanMessage}
          </p>
        )}
      </div>

      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} title="Scan Player QR">
        <QRScanner onResult={handleScanResult} onClose={() => setScanOpen(false)} />
      </Sheet>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/owner/QRScanner.tsx src/components/owner/BookingCard.tsx
git commit -m "feat: QRScanner (BarcodeDetector + manual fallback) and BookingCard"
```

---

## Task 11: Bookings Page

**Files:**
- Create: `src/app/(dashboard)/owner/bookings/page.tsx`

- [ ] **Step 1: Create bookings page**

Create `src/app/(dashboard)/owner/bookings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { BookingCard } from '@/components/owner/BookingCard'
import { BookingsFilter } from '@/components/owner/BookingsFilter'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tab = searchParams.tab === 'all' ? 'all' : 'today'
  const status = (searchParams.status as FilterStatus) ?? 'all'
  const today = new Date().toISOString().split('T')[0]

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', user!.id)

  const courtIds = (courts ?? []).map(c => c.id)

  let query = supabase
    .from('bookings')
    .select('*, player:users(name, phone), slot:slots(date, start_time, end_time), court:courts(name)')
    .in('court_id', courtIds)
    .order('created_at', { ascending: false })

  if (tab === 'today') {
    // Only bookings whose slot is today
    const { data: todaySlots } = await supabase
      .from('slots')
      .select('id')
      .in('court_id', courtIds)
      .eq('date', today)

    const todaySlotIds = (todaySlots ?? []).map(s => s.id)
    if (todaySlotIds.length === 0) {
      return <BookingsPage searchParams={{ ...searchParams, tab: 'today', _empty: 'true' }} />
    }
    query = query.in('slot_id', todaySlotIds).order('slot_id')
  }

  if (status !== 'all') query = query.eq('booking_status', status)

  const { data: bookings } = await query.limit(50)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { key: 'today', label: 'Today' },
          { key: 'all',   label: 'All Bookings' },
        ].map(t => (
          <a key={t.key} href={`/owner/bookings?tab=${t.key}`}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </a>
        ))}
      </div>

      {/* Status filter — only on All tab */}
      {tab === 'all' && <BookingsFilter current={status} />}

      {/* Bookings list */}
      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">{tab === 'today' ? 'No bookings today' : 'No bookings found'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(b => (
            <BookingCard key={b.id} booking={b as never} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create BookingsFilter client component**

Create `src/components/owner/BookingsFilter.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'

const FILTERS = ['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const

export function BookingsFilter({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
      {FILTERS.map(f => (
        <button key={f} onClick={() => router.push(`/owner/bookings?tab=all&status=${f}`)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
            current === f
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {f}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/owner/bookings`. You should see "Today" tab (default) with empty state if no bookings today. Switch to "All Bookings" — filter chips should appear. Tap "Scan QR" on a confirmed booking — camera sheet should open.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/owner/bookings/page.tsx \
        src/components/owner/BookingsFilter.tsx
git commit -m "feat: bookings page with Today/All sub-tabs, filter chips, QR check-in"
```

---

## Task 12: Earnings Page

**Files:**
- Create: `src/components/owner/EarningsChart.tsx`
- Create: `src/app/(dashboard)/owner/earnings/page.tsx`

- [ ] **Step 1: Create CSS-only EarningsChart**

Create `src/components/owner/EarningsChart.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface DailyRevenue { date: string; amount: number }

interface EarningsChartProps {
  data: DailyRevenue[]
  view: 'week' | 'month'
}

export function EarningsChart({ data, view: initialView }: EarningsChartProps) {
  const [view, setView] = useState(initialView)
  const [tooltip, setTooltip] = useState<{ date: string; amount: number } | null>(null)

  const today = new Date()
  const filtered = view === 'week'
    ? data.filter(d => {
        const date = new Date(d.date)
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 6)
        return date >= weekAgo
      })
    : data

  const max = Math.max(...filtered.map(d => d.amount), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">Revenue</p>
        <div className="flex gap-1">
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                view === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="text-center mb-2">
          <span className="text-xs text-gray-500">{new Date(tooltip.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
          <span className="ml-2 text-sm font-semibold text-green-700">₱{tooltip.amount.toLocaleString()}</span>
        </div>
      )}

      <div className="flex items-end gap-1 h-24">
        {filtered.map(d => {
          const heightPct = max > 0 ? (d.amount / max) * 100 : 0
          const isToday = d.date === today.toISOString().split('T')[0]
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
              onMouseEnter={() => setTooltip(d)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => setTooltip(tooltip?.date === d.date ? null : d)}>
              <div
                className={`w-full rounded-t transition-colors ${
                  isToday ? 'bg-green-600' : d.amount > 0 ? 'bg-green-300' : 'bg-gray-100'
                }`}
                style={{ height: `${Math.max(heightPct, d.amount > 0 ? 8 : 4)}%` }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        {filtered.length > 0 && (
          <>
            <span>{new Date(filtered[0].date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
            <span>{new Date(filtered[filtered.length - 1].date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create earnings page**

Create `src/app/(dashboard)/owner/earnings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { EarningsChart } from '@/components/owner/EarningsChart'

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', user!.id)

  const courtIds = (courts ?? []).map(c => c.id)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const PLATFORM_FEE = 0.1

  // This month's bookings
  const { data: thisMonthBookings } = await supabase
    .from('bookings')
    .select('amount, created_at, court:courts(name), player:users(name), slot:slots(date, start_time), payment_method')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: false })

  // Last month's total (for comparison)
  const { data: lastMonthBookings } = await supabase
    .from('bookings')
    .select('amount')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd)

  const grossThisMonth = (thisMonthBookings ?? []).reduce((s, b) => s + Number(b.amount), 0)
  const netThisMonth = grossThisMonth * (1 - PLATFORM_FEE)
  const grossLastMonth = (lastMonthBookings ?? []).reduce((s, b) => s + Number(b.amount), 0)

  const momChange = grossLastMonth > 0
    ? Math.round(((grossThisMonth - grossLastMonth) / grossLastMonth) * 100)
    : null

  // Build daily revenue map for the current month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyMap = new Map<string, number>()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(now.getFullYear(), now.getMonth(), d).toISOString().split('T')[0]
    dailyMap.set(dateStr, 0)
  }
  for (const b of thisMonthBookings ?? []) {
    const date = b.created_at.split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + Number(b.amount))
  }
  const chartData = Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }))

  return (
    <div className="flex flex-col gap-6">
      {/* Big number */}
      <div className="text-center py-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          {now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} Earnings
        </p>
        <p className="text-4xl font-bold text-green-700">₱{grossThisMonth.toLocaleString()}</p>
        <p className="text-sm text-gray-400 mt-1">
          You keep ₱{netThisMonth.toLocaleString()} after 10% platform fee
        </p>
        {momChange !== null && (
          <p className={`text-sm font-medium mt-1 ${momChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {momChange >= 0 ? '↑' : '↓'} {Math.abs(momChange)}% vs last month
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <EarningsChart data={chartData} view="month" />
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Transactions</h2>
        {!thisMonthBookings || thisMonthBookings.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No paid bookings this month</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {thisMonthBookings.map((b, i) => {
              const player = b.player as { name?: string } | null
              const court = b.court as { name?: string } | null
              const slot = b.slot as { date?: string; start_time?: string } | null
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{player?.name ?? 'Player'}</p>
                    <p className="text-xs text-gray-400">
                      {slot?.date} · {slot?.start_time} · {court?.name} · {b.payment_method}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    ₱{Number(b.amount).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/owner/earnings`. You should see the big ₱0 card, an empty bar chart, and "No paid bookings this month." After creating and confirming a test booking, the numbers and chart bar should update on refresh.

- [ ] **Step 4: Commit**

```bash
git add src/components/owner/EarningsChart.tsx src/app/(dashboard)/owner/earnings/page.tsx
git commit -m "feat: earnings page with summary, CSS chart, and transaction list"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Layout: sticky header with stats + tab nav + role guard | Task 1 |
| Redirect `/owner` → `/owner/courts` | Task 1 |
| Courts: listing with status badge, empty state | Task 5 |
| Courts: add/edit via slide-up sheet, 4 steps | Task 4 |
| Courts: photo upload to Supabase Storage | Task 4 |
| Courts: new courts start as `pending` | Task 3 (POST), Task 4 |
| Schedule: weekly grid with color-coded cells | Task 7 (WeeklyGrid) |
| Schedule: tap empty cell → create slot | Task 7 (SlotSheet) |
| Schedule: tap available slot → delete | Task 7 (SlotSheet) |
| Schedule: tap booked/held slot → read-only | Task 7 (SlotSheet) |
| Schedule: bulk generate week | Task 7 (GenerateWeekSheet) + Task 6 |
| Schedule: realtime updates | Task 7 (WeeklyGrid uses useSlotRealtime) |
| Bookings: Today + All sub-tabs | Task 11 |
| Bookings: filter chips | Task 11 |
| Bookings: Scan QR → check-in | Task 10 (BookingCard + QRScanner) + Task 9 |
| Bookings: Mark as Paid for cash | Task 10 (BookingCard) + Task 9 |
| Earnings: big monthly total + net | Task 12 |
| Earnings: month-over-month comparison | Task 12 |
| Earnings: CSS-only bar chart | Task 12 (EarningsChart) |
| Earnings: transaction list | Task 12 |
| No payout scheduling | ✓ (out of scope, not included) |

All spec requirements are covered. No placeholders remain.
