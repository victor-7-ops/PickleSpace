import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HoldTimer } from '@/components/player/HoldTimer'
import { CheckoutForm } from '@/components/player/CheckoutForm'

interface Props {
  params: { id: string }
  searchParams: { slot?: string }
}

export default async function BookPage({ params, searchParams }: Props) {
  const slotId = searchParams.slot
  if (!slotId) redirect(`/courts/${params.id}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/courts/${params.id}/book?slot=${slotId}`)

  // Verify slot is held by this user
  const { data: slot } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, status, held_by, hold_expires_at, court_id')
    .eq('id', slotId)
    .single()

  if (!slot) notFound()

  const { data: court } = await supabase
    .from('courts')
    .select('id, name, hourly_rate')
    .eq('id', slot.court_id)
    .single()

  if (!court) notFound()

  // Slot not held by this user or hold expired
  if (slot.status !== 'held' || slot.held_by !== user.id) {
    redirect(`/courts/${params.id}?error=slot-unavailable`)
  }

  const hours = (() => {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  })()

  const amount = court.hourly_rate * hours

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href={`/courts/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </Link>
        <span className="font-semibold text-gray-900">Checkout</span>
        <HoldTimer
          expiresAt={slot.hold_expires_at!}
          courtId={params.id}
        />
      </header>

      <div className="px-4 py-6">
        <CheckoutForm
          slotId={slotId}
          courtId={params.id}
          courtName={court.name}
          amount={amount}
          date={slot.date}
          startTime={slot.start_time}
          endTime={slot.end_time}
        />
      </div>
    </div>
  )
}
