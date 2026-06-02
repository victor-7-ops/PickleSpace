import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QRDisplay } from '@/components/player/QRDisplay'
import { OpenGamePrompt } from '@/components/player/OpenGamePrompt'

interface Props {
  params: { id: string }
}

export default async function ConfirmedPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/bookings/${params.id}/confirmed`)

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, slot:slots(date, start_time, end_time), court:courts(id, name)')
    .eq('id', params.id)
    .single()

  if (!booking) notFound()

  if (booking.player_id !== user.id) redirect('/player/bookings')

  const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court

  const isPaid = booking.payment_status === 'paid'
  const isCash = booking.payment_method === 'cash'
  const isCancelled = booking.booking_status === 'cancelled'

  // Error state
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">✗</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payment unsuccessful</h1>
          <p className="text-sm text-gray-500 mt-1">Your booking was not completed.</p>
        </div>
        <Link href={`/courts/${(court as { id: string } | null)?.id ?? ''}`}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
          Try again
        </Link>
      </div>
    )
  }

  // Pending state (webhook not yet fired for GCash/card)
  if (!isPaid && !isCash) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Booking Received</h1>
          <p className="text-sm text-gray-500 mt-1">Confirming your payment…</p>
          <p className="text-xs text-gray-400 mt-2">This usually takes a few seconds.</p>
          <Link href={`/bookings/${params.id}/confirmed`}
            className="mt-3 text-sm text-green-600 font-medium hover:underline inline-block">
            Refresh
          </Link>
        </div>
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string } | null)?.name ?? ''}
          date={(slot as { date: string } | null)?.date ?? ''}
          startTime={(slot as { start_time: string } | null)?.start_time ?? ''}
          endTime={(slot as { end_time: string } | null)?.end_time ?? ''}
        />
      </div>
    )
  }

  // Confirmed state (paid or cash)
  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col gap-8">
      {/* Success header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl animate-bounce">✓</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {isCash ? 'Booking Received!' : 'Booking Confirmed!'}
        </h1>
        <div className="mt-2 space-y-0.5 text-sm text-gray-500">
          <p className="font-medium text-gray-700">{(court as { name: string } | null)?.name}</p>
          <p>{(slot as { date: string } | null)?.date} · {(slot as { start_time: string } | null)?.start_time} – {(slot as { end_time: string } | null)?.end_time}</p>
          <p>
            ₱{Number(booking.amount).toLocaleString()} · {booking.payment_method}
            {isCash ? ' — pay at the court' : ' · paid ✓'}
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2">
        <QRDisplay
          token={booking.qr_code}
          courtName={(court as { name: string } | null)?.name ?? ''}
          date={(slot as { date: string } | null)?.date ?? ''}
          startTime={(slot as { start_time: string } | null)?.start_time ?? ''}
          endTime={(slot as { end_time: string } | null)?.end_time ?? ''}
        />
        <p className="text-xs text-gray-400">Also sent to your email as backup</p>
      </div>

      {/* Open Game prompt */}
      <OpenGamePrompt
        slotId={booking.slot_id}
        courtId={(court as { id: string } | null)?.id ?? ''}
      />
    </div>
  )
}
