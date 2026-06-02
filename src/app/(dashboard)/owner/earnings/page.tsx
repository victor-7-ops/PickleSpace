import { createClient } from '@/lib/supabase/server'
import { EarningsChart } from '@/components/owner/EarningsChart'

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', user!.id)

  const courtIds = (courts ?? []).map((c: { id: string }) => c.id)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const PLATFORM_FEE = 0.1

  const { data: thisMonthBookings } = await supabase
    .from('bookings')
    .select('amount, created_at, court:courts(name), player:users(name), slot:slots(date, start_time), payment_method')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: false })

  const { data: lastMonthBookings } = await supabase
    .from('bookings')
    .select('amount')
    .in('court_id', courtIds)
    .eq('payment_status', 'paid')
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd)

  const grossThisMonth = (thisMonthBookings ?? []).reduce((s, b) => s + Number(b.amount), 0)
  const netThisMonth = Math.round(grossThisMonth * (1 - PLATFORM_FEE))
  const grossLastMonth = (lastMonthBookings ?? []).reduce((s, b) => s + Number(b.amount), 0)

  const momChange = grossLastMonth > 0
    ? Math.round(((grossThisMonth - grossLastMonth) / grossLastMonth) * 100)
    : null

  // Build daily revenue map for current month
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
