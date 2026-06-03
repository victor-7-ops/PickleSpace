'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Booking } from '@/types'

interface PlayerBookingCardProps {
  booking: Booking
  qrDataUrl: string
}

export function PlayerBookingCard({ booking, qrDataUrl }: PlayerBookingCardProps) {
  const [qrOpen, setQrOpen] = useState(false)

  const court = booking.court as { name?: string } | null
  const slot = booking.slot as { date?: string; start_time?: string; end_time?: string } | null
  const showQr = booking.booking_status === 'confirmed' || booking.booking_status === 'pending'

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{court?.name ?? 'Court'}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {slot?.date} · {slot?.start_time} – {slot?.end_time}
            </p>
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-semibold text-green-700">₱{Number(booking.amount).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1.5">{booking.payment_method}</span>
          </div>
          {showQr && (
            <button onClick={() => setQrOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
              View QR
            </button>
          )}
        </div>
      </div>

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="Check-in QR Code">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <img src={qrDataUrl} alt="Check-in QR code" className="w-56 h-56" />
          </div>
          <p className="text-sm text-gray-500 text-center">Show this to the court owner for check-in</p>
          <div className="text-center">
            <p className="font-medium text-gray-900">{court?.name}</p>
            <p className="text-sm text-gray-500">{slot?.date} · {slot?.start_time} – {slot?.end_time}</p>
          </div>
        </div>
      </Sheet>
    </>
  )
}
