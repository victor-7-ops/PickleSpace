import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('amount, platform_fee, booking_status, created_at, court:courts(name)')
    .in('booking_status', ['confirmed', 'completed'])
    .order('created_at', { ascending: false })

  const all = bookings ?? []

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfWeek  = (() => {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d.toISOString()
  })()
  const startOfToday = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString()

  const sumFees  = (rows: typeof all) => rows.reduce((a, b) => a + (Number(b.platform_fee) || 0), 0)
  const sumGross = (rows: typeof all) => rows.reduce((a, b) => a + (Number(b.amount)        || 0), 0)

  const allTimeFees  = sumFees(all)
  const monthFees    = sumFees(all.filter(b => b.created_at >= startOfMonth))
  const weekFees     = sumFees(all.filter(b => b.created_at >= startOfWeek))
  const todayFees    = sumFees(all.filter(b => b.created_at >= startOfToday))
  const allTimeGross = sumGross(all)

  const { data: courts } = await supabase.from('courts').select('status')
  const totalCourts   = (courts ?? []).length
  const pendingCourts = (courts ?? []).filter(c => c.status === 'pending').length

  const recent = all.slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform revenue — 10% of every booking</p>
      </div>

      {/* Revenue grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">All-Time Revenue</p>
            <p className="text-3xl font-bold text-primary">{fmt(allTimeFees)}</p>
            <p className="text-xs text-muted-foreground mt-1">from {fmt(allTimeGross)} gross · {all.length} bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Month</p>
            <p className="text-xl font-bold text-foreground">{fmt(monthFees)}</p>
            <p className="text-xs text-muted-foreground">{all.filter(b => b.created_at >= startOfMonth).length} bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Week</p>
            <p className="text-xl font-bold text-foreground">{fmt(weekFees)}</p>
            <p className="text-xs text-muted-foreground">{all.filter(b => b.created_at >= startOfWeek).length} bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Today</p>
            <p className="text-xl font-bold text-foreground">{fmt(todayFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Courts</p>
            <p className="text-xl font-bold text-foreground">{totalCourts}</p>
            {pendingCourts > 0 && (
              <Link href="/admin/courts" className="text-xs text-primary font-semibold hover:underline">
                {pendingCourts} pending →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
          Recent Transactions
        </h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No transactions yet — fees appear here after the first confirmed booking.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((b, i) => {
              const court = b.court as { name?: string } | null
              const date  = new Date(b.created_at).toLocaleDateString('en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
              return (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{court?.name ?? 'Court'}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-primary">+{fmt(Number(b.platform_fee))}</p>
                      <p className="text-xs text-muted-foreground">of {fmt(Number(b.amount))}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
