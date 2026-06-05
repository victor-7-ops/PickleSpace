'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface CourtActionsProps {
  courtId: string
  currentStatus: 'pending' | 'active' | 'inactive'
  compact?: boolean
}

export function CourtActions({ courtId, currentStatus, compact = false }: CourtActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(status)
    try {
      await fetch(`/api/admin/courts/${courtId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (compact) {
    // Just a deactivate/reactivate toggle for already-processed courts
    return currentStatus === 'active' ? (
      <Button variant="outline" size="sm" onClick={() => updateStatus('inactive')}
        disabled={!!loading} className="text-xs h-7 px-2">
        {loading ? '…' : 'Deactivate'}
      </Button>
    ) : (
      <Button variant="secondary" size="sm" onClick={() => updateStatus('active')}
        disabled={!!loading} className="text-xs h-7 px-2">
        {loading ? '…' : 'Reactivate'}
      </Button>
    )
  }

  // Full approve/reject buttons for pending courts
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => updateStatus('active')}
        disabled={!!loading}
        className="flex-1"
        size="sm"
      >
        {loading === 'active' ? 'Approving…' : '✓ Approve'}
      </Button>
      <Button
        variant="outline"
        onClick={() => updateStatus('inactive')}
        disabled={!!loading}
        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
        size="sm"
      >
        {loading === 'inactive' ? 'Rejecting…' : '✕ Reject'}
      </Button>
    </div>
  )
}
