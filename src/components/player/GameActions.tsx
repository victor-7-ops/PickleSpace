'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ActionState = 'can-join' | 'joined' | 'full' | 'host' | 'cancelled' | 'unauthenticated'

interface GameActionsProps {
  gameId: string
  actionState: ActionState
}

export function GameActions({ gameId, actionState }: GameActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {actionState === 'can-join' && (
        <Button onClick={() => callApi('join')} disabled={loading} className="w-full" size="lg">
          {loading ? 'Joining…' : 'Join Game →'}
        </Button>
      )}

      {actionState === 'joined' && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-sm font-semibold text-primary">✓ You&apos;re in!</p>
          <Button variant="outline" onClick={() => callApi('leave')} disabled={loading} className="w-full">
            {loading ? 'Leaving…' : 'Leave Game'}
          </Button>
        </div>
      )}

      {actionState === 'full' && (
        <Button disabled className="w-full" size="lg">Game Full</Button>
      )}

      {actionState === 'host' && (
        <AlertDialog>
          <AlertDialogTrigger className="w-full">
            <Button variant="destructive" disabled={loading} className="w-full" size="lg">
              {loading ? 'Cancelling…' : 'Cancel Game'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this game?</AlertDialogTitle>
              <AlertDialogDescription>
                All joined players will see the game marked as cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Game</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => callApi('cancel')}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {actionState === 'unauthenticated' && (
        <Button className="w-full" size="lg" onClick={() => router.push(`/login?next=/games/${gameId}`)}>
          Log in to join →
        </Button>
      )}

      {actionState === 'cancelled' && (
        <p className="text-center text-sm text-muted-foreground py-3 border border-border rounded-xl">
          This game has been cancelled
        </p>
      )}
    </div>
  )
}
