'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface OpenGamePromptProps {
  slotId: string
  courtId: string
}

export function OpenGamePrompt({ slotId, courtId }: OpenGamePromptProps) {
  const router = useRouter()
  return (
    <Card className="border-primary/30 bg-secondary">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">🏓</span>
          <div>
            <p className="font-semibold text-foreground text-sm">Need a playing partner?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Post this slot to the matchmaking feed — other players can request to join your game.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => router.push(`/games/new?slot=${slotId}&court=${courtId}`)}
          >
            Post Open Game
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.push('/player/bookings')}>
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
