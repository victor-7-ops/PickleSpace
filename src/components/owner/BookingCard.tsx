'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { QRScanner } from './QRScanner'
import type { Booking } from '@/types'

export function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter()
  const [scanOpen, setScanOpen] = useState(false)
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)

  async function handleScanResult(code: string) {
    setScanOpen(false)
    const res = await fetch(`/api/bookings/${booking.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: code }),
    })
    const json = await res.json()
    if (res.ok) {
      setScanResult('success'); setScanMessage('Check-in successful!')
      router.refresh()
    } else {
      setScanResult('error'); setScanMessage(json.error ?? 'Check-in failed')
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true)
    const res = await fetch(`/api/bookings/${booking.id}/mark-paid`, { method: 'POST' })
    if (res.ok) router.refresh()
    setMarkingPaid(false)
  }

  const playerName = (booking.player as { name?: string } | undefined)?.name ?? 'Player'
  const timeRange = `${booking.slot?.start_time ?? ''} – ${booking.slot?.end_time ?? ''}`
  const isCashUnpaid = booking.payment_method === 'cash' && booking.payment_status === 'unpaid'
  const isConfirmed = booking.booking_status === 'confirmed'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{playerName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{timeRange}</p>
            {booking.court && (
              <p className="text-xs text-gray-400 mt-0.5">{(booking.court as { name?: string }).name}</p>
            )}
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-semibold text-green-700">₱{Number(booking.amount).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1.5">
              {booking.payment_method} · {booking.payment_status}
            </span>
          </div>
          <div className="flex gap-2">
            {isCashUnpaid && (
              <button onClick={handleMarkPaid} disabled={markingPaid}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 disabled:opacity-40">
                {markingPaid ? 'Saving…' : 'Mark Paid'}
              </button>
            )}
            {isConfirmed && (
              <button onClick={() => { setScanResult(null); setScanOpen(true) }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                Scan QR
              </button>
            )}
          </div>
        </div>

        {scanResult && (
          <p className={`mt-2 text-xs font-medium ${scanResult === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {scanResult === 'success' ? '✓' : '✗'} {scanMessage}
          </p>
        )}
      </div>

      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} title="Scan Player QR">
        <QRScanner onResult={handleScanResult} onClose={() => setScanOpen(false)} />
      </Sheet>
    </>
  )
}
