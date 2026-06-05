import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QRDisplay } from '@/components/player/QRDisplay'
import { OpenGamePrompt } from '@/components/player/OpenGamePrompt'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function ConfirmedPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/bookings/${params.id}/confirmed`)

  const { data: rawBooking } = await supabase
    .from('bookings')
    .select('*, slot:slots(date, start_time, end_time), court:courts(id, name)')
    .eq('id', params.id)
    .single()

  if (!rawBooking) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = rawBooking as any

  if (booking.player_id !== user.id) redirect('/player/bookings')

  const slot  = Array.isArray(booking.slot)  ? booking.slot[0]  : booking.slot
  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court

  const isPaid     = booking.payment_status  === 'paid'
  const isCash     = booking.payment_method  === 'cash'
  const isCancelled = booking.booking_status === 'cancelled'

  const courtName  = (court as { name: string } | null)?.name  ?? ''
  const courtId    = (court as { id: string }   | null)?.id    ?? ''
  const slotDate   = (slot  as { date: string } | null)?.date  ?? ''
  const slotStart  = (slot  as { start_time: string } | null)?.start_time ?? ''
  const slotEnd    = (slot  as { end_time: string }   | null)?.end_time   ?? ''

  function formatDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
  }

  function formatTime(t: string) {
    if (!t) return ''
    const [h] = t.split(':').map(Number)
    return h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
  }

  // ─── Error state ────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <span className="text-4xl">✗</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment unsuccessful</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Your booking was not completed. The slot may have been released.
          </p>
        </div>
        <Link href={`/courts/${courtId}`} className={cn(buttonVariants({ size: 'lg' }))}>
          Try again →
        </Link>
        <Link href="/player/discover" className="text-sm text-muted-foreground hover:text-foreground">
          Browse other courts
        </Link>
      </div>
    )
  }

  // ─── Pending state (PayMongo webhook not yet fired) ──────────────────
  if (!isPaid && !isCash) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-amber-100/50">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Confirming payment…</h1>
          <p className="text-sm text-muted-foreground mt-1">This usually takes a few seconds.</p>
          <Link
            href={`/bookings/${params.id}/confirmed`}
            className="mt-3 text-sm text-primary font-semibold hover:underline inline-block"
          >
            Tap to refresh
          </Link>
        </div>
        <QRDisplay token={booking.qr_code} courtName={courtName} date={slotDate} startTime={slotStart} endTime={slotEnd} />
      </div>
    )
  }

  // ─── Confirmed state (paid or cash) ─────────────────────────────────
  return (
    <div className="min-h-screen bg-muted px-4 py-8 flex flex-col gap-6 max-w-sm mx-auto">

      {/* Success header — the emotional high point */}
      <div className="text-center pt-4">
        {/* Ripple ring + checkmark */}
        <div className="relative w-24 h-24 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s', animationIterationCount: 1 }} />
          <div className="relative w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-4xl text-primary-foreground font-bold">✓</span>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {isCash ? "You're booked!" : "Court booked!"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isCash ? 'Pay at the court on arrival.' : 'Payment confirmed. See you on the court! 🏓'}
        </p>
      </div>

      {/* Booking summary card — prominent, not buried */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-primary" />
        <CardContent className="p-5">
          <p className="font-bold text-lg text-foreground leading-tight">{courtName}</p>
          <p className="text-sm text-primary font-semibold mt-1">{formatDate(slotDate)}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(slotStart)} – {formatTime(slotEnd)}
          </p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">Total paid</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              ₱{Number(booking.amount).toLocaleString()}
            </span>
          </div>
          {isCash && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium">
              💵 Cash — bring exact amount to the court
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR code */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4 text-center">
            Check-in QR
          </p>
          <QRDisplay token={booking.qr_code} courtName={courtName} date={slotDate} startTime={slotStart} endTime={slotEnd} />
          <p className="text-xs text-muted-foreground text-center mt-3">
            Also sent to your email as backup
          </p>
        </CardContent>
      </Card>

      {/* Open game prompt */}
      <OpenGamePrompt slotId={booking.slot_id} courtId={courtId} />

      {/* Navigation */}
      <div className="flex flex-col gap-2 pb-8">
        <Link href="/player/bookings" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
          View my bookings
        </Link>
        <Link href="/player/discover" className="text-sm text-muted-foreground text-center hover:text-foreground">
          Book another court →
        </Link>
      </div>
    </div>
  )
}
