import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/ui/sign-out-button'

async function getOwnerStats(userId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', userId)

  const courtIds = (courts ?? []).map((c: { id: string }) => c.id)
  if (courtIds.length === 0) return { bookingsToday: 0, revenueThisWeek: 0 }

  // Step 1: get today's slot IDs for this owner's courts
  const { data: todaySlots } = await supabase
    .from('slots')
    .select('id')
    .in('court_id', courtIds)
    .eq('date', today)

  const todaySlotIds = (todaySlots ?? []).map((s: { id: string }) => s.id)

  // Step 2: count confirmed bookings for those slots
  let bookingsToday = 0
  if (todaySlotIds.length > 0) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('slot_id', todaySlotIds)
      .eq('booking_status', 'confirmed')
    bookingsToday = count ?? 0
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: weekBookings } = await supabase
    .from('bookings')
    .select('amount')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', `${weekStartStr}T00:00:00`)

  const revenueThisWeek = (weekBookings ?? []).reduce((sum: number, b: { amount: unknown }) => sum + Number(b.amount), 0)

  return { bookingsToday, revenueThisWeek }
}

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
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="sticky top-0 z-40 bg-court-700 text-white elevation-2">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-base">{greeting}, {(profile.name ?? 'there').split(' ')[0]}</p>
            <SignOutButton className="text-xs text-white/70 hover:text-white transition-colors">
              Sign out
            </SignOutButton>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} className="text-accent" aria-hidden="true" />
              <span className="tabular-nums">{stats.bookingsToday}</span> booking{stats.bookingsToday !== 1 ? 's' : ''} today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={14} className="text-accent" aria-hidden="true" />
              <span className="tabular-nums">₱{stats.revenueThisWeek.toLocaleString()}</span> this week
            </span>
          </div>
        </div>
        <nav aria-label="Owner navigation" className="flex border-t border-court-500 mt-2">
          {[
            { href: '/owner/courts',   label: 'Courts'   },
            { href: '/owner/schedule', label: 'Schedule' },
            { href: '/owner/bookings', label: 'Bookings' },
            { href: '/owner/earnings', label: 'Earnings' },
          ].map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={undefined}
              className="flex-1 py-2 text-center text-sm font-medium text-white/70 hover:text-white hover:bg-court-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
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
