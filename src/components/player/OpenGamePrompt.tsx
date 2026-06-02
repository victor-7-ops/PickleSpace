'use client'
import { useRouter } from 'next/navigation'

interface OpenGamePromptProps {
  slotId: string
  courtId: string
}

export function OpenGamePrompt({ slotId, courtId }: OpenGamePromptProps) {
  const router = useRouter()

  return (
    <div className="border border-green-200 bg-green-50 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🏓</span>
        <div className="flex-1">
          <p className="font-semibold text-green-900 text-sm">Need a playing partner?</p>
          <p className="text-xs text-green-700 mt-1 leading-relaxed">
            Post this slot to the matchmaking feed — other players can request to join your game.
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <button
          onClick={() => router.push(`/games/new?slot=${slotId}&court=${courtId}`)}
          className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
          Post Open Game
        </button>
        <button
          onClick={() => router.push('/player/bookings')}
          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
          Skip
        </button>
      </div>
    </div>
  )
}
