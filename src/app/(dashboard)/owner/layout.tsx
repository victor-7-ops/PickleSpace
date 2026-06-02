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
      <header className="sticky top-0 z-40 bg-green-600 text-white shadow-md">
        <div className="px-4 pt-4 pb-2">
          <p className="font-semibold text-base">{greeting}, {profile.name.split(' ')[0]} 👋</p>
          <div className="flex gap-4 mt-1 text-sm text-green-100">
            <span>📅 {stats.bookingsToday} booking{stats.bookingsToday !== 1 ? 's' : ''} today</span>
            <span>💰 ₱{stats.revenueThisWeek.toLocaleString()} this week</span>
          </div>
        </div>
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
