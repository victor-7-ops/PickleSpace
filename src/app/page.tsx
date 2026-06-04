import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏓</span>
          <span className="text-lg font-bold text-primary">PickleSpace</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-lg mx-auto w-full">
        <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <span className="text-4xl">🏟</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground mb-3 leading-tight tracking-tight">
          Book pickleball courts<br />in Cebu, instantly.
        </h1>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          Real-time availability · GCash & card payments · Player matchmaking
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/player/discover" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            Find a court →
          </Link>
          <Link href="/player/games" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}>
            Join a game
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          Are you a court owner?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            List your court →
          </Link>
        </p>
      </section>
    </main>
  )
}
