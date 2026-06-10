import Link from 'next/link'
import { MapPin, Calendar, Wallet, BadgeCheck, LandPlot } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo — navy court, lime ball */}
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <span className="w-3.5 h-3.5 rounded-full bg-accent" />
          </div>
          <span className="font-extrabold text-foreground text-lg tracking-tight" translate="no">PickleSpace</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Log in
        </Link>
      </header>

      {/* Court line — lime boundary strip */}
      <div className="h-1 bg-accent" />

      <main className="flex-1 px-5 pt-8 pb-12 max-w-sm mx-auto w-full flex flex-col gap-8">

        {/* Headline — oversized athletic display type */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground motion-safe:animate-pulse" />
            Live in Cebu
          </div>
          <h1 className="font-display text-5xl uppercase text-foreground leading-[0.95] mb-3">
            Find your<br />court.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Real-time slots. GCash payments.<br />Find players near you.
          </p>
        </div>

        {/* Product preview — the actual product, not marketing copy */}
        <div className="rounded-lg court-line bg-card elevation-2 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">When do you want to play?</p>
            <div className="flex gap-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full">Today</span>
              <span className="bg-background border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">Tomorrow</span>
              <span className="bg-background border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden="true" /> Pick date
              </span>
            </div>
          </div>

          {[
            { name: 'Cebu Pickle Arena', city: 'Mandaue', rate: 500, slots: 5, density: 'high' },
            { name: 'SM Seaside Courts', city: 'SRP, Cebu City', rate: 450, slots: 3, density: 'mid' },
          ].map((court, i) => (
            <div key={i} className="flex overflow-hidden">
              {/* Availability strip */}
              <div className={`w-1 flex-shrink-0 ${court.density === 'high' ? 'bg-ball-400' : 'bg-amber-400'}`} />
              <div className={`flex-1 px-4 py-3 flex items-center justify-between${i === 0 ? ' border-b border-border' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{court.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                    <MapPin size={12} aria-hidden="true" /> {court.city}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-primary tabular-nums">
                    ₱{court.rate}<span className="text-xs font-normal text-muted-foreground">/hr</span>
                  </p>
                  <p className={`text-xs font-semibold mt-0.5 ${court.density === 'high' ? 'text-ball-700' : 'text-amber-700'}`}>
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

        {/* CTAs — lime power primary, navy outline secondary */}
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="w-full py-3.5 bg-accent text-accent-foreground text-sm font-bold rounded-full text-center elevation-1 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Find a court now →
          </Link>
          <Link
            href="/player/games"
            className="w-full py-3.5 border-2 border-primary text-primary text-sm font-semibold rounded-full text-center hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            Browse open games
          </Link>
        </div>

        {/* Trust stats — scan-friendly */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
          {[
            { Icon: BadgeCheck, value: 'Free', label: 'to join' },
            { Icon: Wallet, value: 'GCash', label: 'payments' },
            { Icon: MapPin, value: 'Cebu', label: 'first' },
          ].map(({ Icon, value, label }) => (
            <div key={value} className="bg-card text-center py-4">
              <Icon size={18} className="mx-auto mb-1.5 text-primary" aria-hidden="true" />
              <p className="text-sm font-extrabold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Court owner CTA */}
        <div className="rounded-lg court-line bg-secondary/40 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <LandPlot size={20} className="text-accent" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Own a court?</p>
            <p className="text-xs text-muted-foreground mt-0.5">List it free · get bookings today</p>
          </div>
          <Link
            href="/register"
            className="text-xs font-bold text-primary bg-background border border-primary/30 px-3 py-2 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
          >
            List →
          </Link>
        </div>
      </main>
    </div>
  )
}
