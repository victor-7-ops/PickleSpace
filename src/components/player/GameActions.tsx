'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'

type ActionState = 'can-join' | 'joined' | 'full' | 'host' | 'cancelled' | 'unauthenticated'

interface GameActionsProps {
  gameId: string
  actionState: ActionState
}

export function GameActions({ gameId, actionState }: GameActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)

  async function callApi(path: string) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/${path}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setCancelOpen(false)
    await callApi('cancel')
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {actionState === 'can-join' && (
        <button onClick={() => callApi('join')} disabled={loading}
          className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
          {loading ? 'Joining…' : 'Join Game →'}
        </button>
      )}

      {actionState === 'joined' && (
        <div className="flex flex-col gap-2">
          <div className="text-center py-2 text-green-700 font-semibold text-sm">✓ You&apos;re in!</div>
          <button onClick={() => callApi('leave')} disabled={loading}
            className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
            {loading ? 'Leaving…' : 'Leave Game'}
          </button>
        </div>
      )}

      {actionState === 'full' && (
        <button disabled
          className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
          Game Full
        </button>
      )}

      {actionState === 'host' && (
        <button onClick={() => setCancelOpen(true)} disabled={loading}
          className="w-full py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 disabled:opacity-40 transition-colors">
          {loading ? 'Cancelling…' : 'Cancel Game'}
        </button>
      )}

      {actionState === 'unauthenticated' && (
        <a href={`/login?next=/games/${gameId}`}
          className="block w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm text-center hover:bg-green-700 transition-colors">
          Log in to join →
        </a>
      )}

      {actionState === 'cancelled' && (
        <div className="w-full py-3 bg-gray-50 border border-gray-100 rounded-xl text-center text-sm text-gray-400">
          This game has been cancelled
        </div>
      )}

      {/* Cancel confirmation sheet */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Game">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Cancel this game? All joined players will see the game marked as cancelled.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setCancelOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Keep Game
            </button>
            <button onClick={handleCancel}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
              Yes, Cancel
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
