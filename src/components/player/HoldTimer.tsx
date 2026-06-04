'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface HoldTimerProps {
  expiresAt: string
  courtId: string
}

export function HoldTimer({ expiresAt, courtId }: HoldTimerProps) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isExpired = secondsLeft === 0
  const isUrgent = secondsLeft <= 120

  if (isExpired) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⏰</p>
        <p className="font-semibold text-foreground mb-1">Your hold expired</p>
        <p className="text-sm text-muted-foreground mb-4">Someone else may have taken this slot.</p>
        <Button onClick={() => router.push(`/courts/${courtId}`)}>
          Pick another slot
        </Button>
      </div>
    )
  }

  return (
    <Badge variant={isUrgent ? 'destructive' : 'outline'} className="tabular-nums">
      ⏱ {mins}:{String(secs).padStart(2, '0')} remaining
    </Badge>
  )
}
