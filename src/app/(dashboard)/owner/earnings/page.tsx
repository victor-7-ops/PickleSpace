import { createClient } from '@/lib/supabase/server'
import { EarningsChart } from '@/components/owner/EarningsChart'
import { Card, CardContent } from '@/components/ui/card'

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
  const OPEN_PLAY_FEE = 0.05

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

  // Open-play revenue: per-head × paid attendees for owner-hosted games this month
  let openPlayGrossCentavos = 0
  let openPlayGameCount = 0
  if (courtIds.length > 0) {
    const { data: openPlayGames } = await supabase
      .from('games')
      .select('id, price_per_head')
      .in('court_id', courtIds)
      .eq('host_type', 'owner')
      .gte('created_at', monthStart)

    if (openPlayGames?.length) {
      openPlayGameCount = openPlayGames.length
      const gameIds = openPlayGames.map(g => g.id)
      const priceMap = new Map(openPlayGames.map(g => [g.id, Number(g.price_per_head)]))
      const { data: paidPlayers } = await supabase
        .from('game_players')
        .select('game_id')
        .in('game_id', gameIds)
        .eq('payment_status', 'paid')
      openPlayGrossCentavos = (paidPlayers ?? []).reduce(
        (sum, gp) => sum + (priceMap.get(gp.game_id) ?? 0), 0
      )
    }
  }
  const openPlayGross = openPlayGrossCentavos / 100
  const openPlayNet = openPlayGross * (1 - OPEN_PLAY_FEE)

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
      <Card className="text-center">
        <CardContent className="py-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} Earnings
          </p>
          <p className="text-4xl font-bold text-primary tabular-nums">
            ₱{(grossThisMonth + openPlayGross).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            You keep ₱{(netThisMonth + openPlayNet).toLocaleString()} after fees
          </p>
          {momChange !== null && (
            <p className={`text-sm font-medium mt-1 ${momChange >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {momChange >= 0 ? '↑' : '↓'} {Math.abs(momChange)}% vs last month
            </p>
          )}
          {/* Revenue breakdown chips */}
          {(grossThisMonth > 0 || openPlayGross > 0) && (
            <div className="flex justify-center gap-2 flex-wrap mt-3">
              {grossThisMonth > 0 && (
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full tabular-nums">
                  Court bookings ₱{grossThisMonth.toLocaleString()} gross · ₱{netThisMonth.toLocaleString()} net
                </span>
              )}
              {openPlayGross > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full tabular-nums">
                  🏓 Open Play ₱{openPlayGross.toLocaleString()} gross · ₱{Math.round(openPlayNet).toLocaleString()} net (5% fee)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <EarningsChart data={chartData} view="month" />
        </CardContent>
      </Card>

      {/* Open Play summary */}
      {openPlayGameCount > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Open Play</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {openPlayGameCount} session{openPlayGameCount !== 1 ? 's' : ''} this month
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ₱{openPlayGross.toLocaleString()} gross · 5% platform fee
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary tabular-nums">₱{Math.round(openPlayNet).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">you keep</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Court Bookings</h2>
        {!thisMonthBookings || thisMonthBookings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No paid bookings this month</p>
        ) : (
          <Card className="overflow-hidden">
            <div className="flex flex-col divide-y divide-border">
              {thisMonthBookings.map((b, i) => {
                const player = b.player as { name?: string } | null
                const court = b.court as { name?: string } | null
                const slot = b.slot as { date?: string; start_time?: string } | null
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{player?.name ?? 'Player'}</p>
                      <p className="text-xs text-muted-foreground">
                        {slot?.date} · {slot?.start_time} · {court?.name} · {b.payment_method}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ₱{Number(b.amount).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
