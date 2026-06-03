'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface HoldTimerProps {
  expiresAt: string    // ISO timestamp
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
        if (s <= 1) {
          clearInterval(interval)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isExpired = secondsLeft === 0
  const isUrgent = secondsLeft <= 120

  if (isExpired) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⏰</p>
        <p className="font-semibold text-gray-900 mb-1">Your hold expired</p>
        <p className="text-sm text-gray-500 mb-4">Someone else may have taken this slot.</p>
        <button onClick={() => router.push(`/courts/${courtId}`)}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
          Pick another slot
        </button>
      </div>
    )
  }

  return (
    <span className={`text-sm font-semibold tabular-nums px-3 py-1 rounded-full ${
      isUrgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
    }`}>
      ⏱ {mins}:{String(secs).padStart(2, '0')} remaining
    </span>
  )
}
