'use client'
import { useState } from 'react'
import { CourtSheet } from './CourtSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Court } from '@/types'

export function CourtsList({ courts }: { courts: Court[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | undefined>()

  function openAdd() { setEditingCourt(undefined); setSheetOpen(true) }
  function openEdit(court: Court) { setEditingCourt(court); setSheetOpen(true) }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">My Courts</h1>
        <button onClick={openAdd}
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          + Add Court
        </button>
      </div>

      {courts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-medium text-gray-600 mb-1">No courts yet</p>
          <p className="text-sm mb-4">List your first court and start accepting bookings.</p>
          <button onClick={openAdd}
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            List your first court
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courts.map(court => (
            <button key={court.id} onClick={() => openEdit(court)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-3">
                {court.images[0] && (
                  <img src={court.images[0]} alt={court.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{court.name}</p>
                    <StatusBadge status={court.status} />
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{court.address}</p>
                  <p className="text-sm font-medium text-green-700 mt-1">₱{court.hourly_rate.toLocaleString()}</p>
                </div>
              </div>
            </button>
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
