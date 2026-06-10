'use client'
import { useRouter } from 'next/navigation'
import { Swords } from 'lucide-react'
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
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Swords size={16} className="text-accent-foreground" aria-hidden="true" />
          </div>
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
