'use client'
import { useState } from 'react'
import { CourtSheet } from './CourtSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Court } from '@/types'

export function CourtsList({ courts }: { courts: Court[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | undefined>()

  function openAdd() { setEditingCourt(undefined); setSheetOpen(true) }
  function openEdit(court: Court) { setEditingCourt(court); setSheetOpen(true) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-foreground">My Courts</h1>
        <Button onClick={openAdd} size="sm">+ Add Court</Button>
      </div>

      {courts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-medium text-foreground mb-1">No courts yet</p>
          <p className="text-sm mb-4">List your first court and start accepting bookings.</p>
          <Button onClick={openAdd}>List your first court</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courts.map(court => (
            <Card key={court.id} className="cursor-pointer hover:shadow-md transition-shadow w-full text-left" onClick={() => openEdit(court)}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {court.images[0] && (
                    <img src={court.images[0]} alt={court.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{court.name}</p>
                      <Badge
                        variant={court.status === 'active' ? 'secondary' : court.status === 'pending' ? 'outline' : 'destructive'}
                        className="capitalize flex-shrink-0"
                      >
                        {court.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{court.address}</p>
                    <p className="text-sm font-medium text-primary mt-1">₱{court.hourly_rate.toLocaleString()}/hr</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CourtSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        court={editingCourt}
      />
    </>
  )
}
