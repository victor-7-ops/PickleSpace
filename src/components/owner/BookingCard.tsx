'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{playerName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{timeRange}</p>
              {booking.court && (
                <p className="text-xs text-muted-foreground mt-0.5">{(booking.court as { name?: string }).name}</p>
              )}
            </div>
            <Badge
              variant={booking.booking_status === 'confirmed' ? 'secondary' : booking.booking_status === 'completed' ? 'outline' : 'destructive'}
              className="capitalize"
            >
              {booking.booking_status}
            </Badge>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="font-semibold text-primary">₱{Number(booking.amount).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {booking.payment_method} · {booking.payment_status}
              </span>
            </div>
            <div className="flex gap-2">
              {isCashUnpaid && (
                <Button variant="outline" size="sm" onClick={handleMarkPaid} disabled={markingPaid}>
                  {markingPaid ? 'Saving…' : 'Mark Paid'}
                </Button>
              )}
              {isConfirmed && (
                <Button variant="secondary" size="sm" onClick={() => { setScanResult(null); setScanOpen(true) }}>
                  Scan QR
                </Button>
              )}
            </div>
          </div>

          {scanResult && (
            <p className={`mt-2 text-xs font-medium ${scanResult === 'success' ? 'text-primary' : 'text-destructive'}`}>
              {scanResult === 'success' ? '✓' : '✗'} {scanMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} title="Scan Player QR">
        <QRScanner onResult={handleScanResult} onClose={() => setScanOpen(false)} />
      </Sheet>
    </>
  )
}
