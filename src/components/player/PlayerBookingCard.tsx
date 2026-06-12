'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OpenGameSheet } from './OpenGameSheet'
import type { Booking } from '@/types'

interface PlayerBookingCardProps {
  booking: Booking
  qrDataUrl: string
  linkedGameId?: string | null   // set if a game already exists for this booking
  isUpcoming?: boolean
}

export function PlayerBookingCard({ booking, qrDataUrl, linkedGameId, isUpcoming }: PlayerBookingCardProps) {
  const [qrOpen, setQrOpen] = useState(false)
  const [openGameOpen, setOpenGameOpen] = useState(false)

  const court = booking.court as { name?: string } | null
  const slot = booking.slot as { date?: string; start_time?: string; end_time?: string } | null
  const showQr = booking.booking_status === 'confirmed' || booking.booking_status === 'pending'
  // Only confirmed upcoming bookings can spawn a player-hosted game
  const canOpenGame = booking.booking_status === 'confirmed' && isUpcoming

  const statusVariant = {
    confirmed: 'secondary' as const,
    pending: 'outline' as const,
    completed: 'outline' as const,
    cancelled: 'destructive' as const,
  }[booking.booking_status] ?? 'outline'

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{court?.name ?? 'Court'}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {slot?.date} · {slot?.start_time} – {slot?.end_time}
              </p>
            </div>
            <Badge variant={statusVariant} className="capitalize">{booking.booking_status}</Badge>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="font-bold text-primary tabular-nums">₱{Number(booking.amount).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{booking.payment_method}</span>
            </div>
            <div className="flex gap-2">
              {showQr && (
                <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                  View QR
                </Button>
              )}
              {canOpenGame && (
                linkedGameId ? (
                  <Link
                    href={`/games/${linkedGameId}`}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
                  >
                    View game
                  </Link>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setOpenGameOpen(true)}>
                    🏓 Open game
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {canOpenGame && !linkedGameId && (
        <OpenGameSheet
          bookingId={booking.id}
          bookingAmountPhp={Number(booking.amount)}
          open={openGameOpen}
          onClose={() => setOpenGameOpen(false)}
        />
      )}

      <Drawer open={qrOpen} onOpenChange={setQrOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Check-in QR Code</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col items-center gap-4 px-4 pb-8">
            <div className="bg-background p-4 rounded-2xl border border-border shadow-sm">
              <img src={qrDataUrl} alt="Check-in QR code" className="size-56" />
            </div>
            <p className="text-sm text-muted-foreground text-center">Show this to the court owner for check-in</p>
            <div className="text-center">
              <p className="font-semibold text-foreground">{court?.name}</p>
              <p className="text-sm text-muted-foreground">{slot?.date} · {slot?.start_time} – {slot?.end_time}</p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
