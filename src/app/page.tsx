import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo — paddle + ball feel */}
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-lg leading-none flex-shrink-0">
            🏓
          </div>
          <span className="font-extrabold text-foreground text-lg tracking-tight">PickleSpace</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Log in
        </Link>
      </header>

      {/* Hero strip — green gradient accent, not a blob */}
      <div className="h-1 bg-gradient-to-r from-primary via-green-400 to-primary/40" />

      <main className="flex-1 px-5 pt-8 pb-12 max-w-sm mx-auto w-full flex flex-col gap-8">

        {/* Headline — purpose-first, not tagline-first */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live in Cebu
          </div>
          <h1 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight mb-2">
            Book pickleball<br />courts instantly.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Real-time slots. GCash payments.<br />Find players near you.
          </p>
        </div>

        {/* Product preview — the actual product, not marketing copy */}
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">When do you want to play?</p>
            <div className="flex gap-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full">Today</span>
              <span className="bg-background border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">Tomorrow</span>
              <span className="bg-background border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">📅 Pick date</span>
            </div>
          </div>

          {[
            { name: 'Cebu Pickle Arena', city: 'Mandaue', rate: 500, slots: 5, density: 'high' },
            { name: 'SM Seaside Courts', city: 'SRP, Cebu City', rate: 450, slots: 3, density: 'mid' },
          ].map((court, i) => (
            <div key={i} className="flex overflow-hidden">
              {/* Availability strip */}
              <div className={`w-1 flex-shrink-0 ${court.density === 'high' ? 'bg-green-500' : 'bg-amber-400'}`} />
              <div className={`flex-1 px-4 py-3 flex items-center justify-between${i === 0 ? ' border-b border-border' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{court.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">📍 {court.city}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-primary tabular-nums">
                    ₱{court.rate}<span className="text-xs font-normal text-muted-foreground">/hr</span>
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${court.density === 'high' ? 'text-green-700' : 'text-amber-700'}`}>
                    {court.slots} slots open
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-muted/40 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">+ 8 more courts available in Cebu</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="w-full py-3.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl text-center hover:opacity-90 transition-opacity"
          >
            Find a court now →
          </Link>
          <Link
            href="/player/games"
            className="w-full py-3.5 border border-border text-foreground text-sm font-semibold rounded-xl text-center hover:bg-muted transition-colors"
          >
            Browse open games
          </Link>
        </div>

        {/* Trust stats — scan-friendly */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {[
            { icon: '🆓', value: 'Free', label: 'to join' },
            { icon: '💳', value: 'GCash', label: 'payments' },
            { icon: '📍', value: 'Cebu', label: 'first' },
          ].map(stat => (
            <div key={stat.value} className="bg-background text-center py-4">
              <p className="text-lg leading-none mb-1">{stat.icon}</p>
              <p className="text-sm font-extrabold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Court owner CTA */}
        <div className="rounded-xl border border-primary/20 bg-secondary/40 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            🏟
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Own a court?</p>
            <p className="text-xs text-muted-foreground mt-0.5">List it free · get bookings today</p>
          </div>
          <Link
            href="/register"
            className="text-xs font-bold text-primary bg-background border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
          >
            List →
          </Link>
        </div>
      </main>
    </div>
  )
}
