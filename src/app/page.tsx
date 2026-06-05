import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-base font-bold">
            P
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">PickleSpace</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Log in
        </Link>
      </header>

      <main className="flex-1 px-5 pt-6 pb-12 max-w-sm mx-auto w-full flex flex-col gap-8">
        {/* Headline */}
        <div>
          <h1 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight mb-2">
            Book pickleball<br />courts in Cebu.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Real-time availability. GCash payments. Find players to join your game.
          </p>
        </div>

        {/* Product preview — mock discovery UI showing the actual product */}
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">When do you want to play?</p>
            <div className="flex gap-2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full">Today</span>
              <span className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">Tomorrow</span>
              <span className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">Pick date</span>
            </div>
          </div>
          {[
            { name: 'Cebu Pickle Arena', city: 'Mandaue', rate: 500, slots: 5 },
            { name: 'SM Seaside Courts', city: 'SRP, Cebu City', rate: 450, slots: 3 },
          ].map((court, i) => (
            <div key={i} className={`px-4 py-3 flex items-center justify-between${i === 0 ? ' border-b border-border' : ''}`}>
              <div>
                <p className="text-sm font-semibold text-foreground">{court.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{court.city}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-bold text-primary tabular-nums">
                  ₱{court.rate}<span className="text-xs font-normal text-muted-foreground">/hr</span>
                </p>
                <p className="text-xs text-primary font-medium mt-0.5">{court.slots} slots open</p>
              </div>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">+ 8 more courts available in Cebu</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="w-full py-3.5 bg-primary text-white text-sm font-bold rounded-xl text-center hover:opacity-90 transition-opacity"
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

        {/* Trust stats */}
        <div className="flex items-center gap-4 py-4 border-t border-border">
          {[
            { value: 'Free', label: 'to join' },
            { value: 'GCash', label: 'payments' },
            { value: 'Cebu', label: 'first' },
          ].map((stat, i) => (
            <>
              {i > 0 && <div key={`d${i}`} className="w-px h-8 bg-border" />}
              <div key={stat.value} className="text-center flex-1">
                <p className="text-base font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </>
          ))}
        </div>

        {/* Court owner CTA */}
        <div className="rounded-xl bg-muted p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            🏟
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Own a court?</p>
            <p className="text-xs text-muted-foreground">List it free and start getting bookings today.</p>
          </div>
          <Link href="/register" className="text-xs font-bold text-primary hover:underline flex-shrink-0">
            List →
          </Link>
        </div>
      </main>
    </div>
  )
}
