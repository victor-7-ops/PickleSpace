'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SkillLevel = 'open' | 'beginner' | 'intermediate' | 'advanced'

interface CreateGameFormProps {
  courtId?: string
  courtName?: string
  slotId?: string
  slotDate?: string
  slotStart?: string
  slotEnd?: string
}

export function CreateGameForm({ courtId, courtName, slotId, slotDate, slotStart, slotEnd }: CreateGameFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [skill, setSkill] = useState<SkillLevel>('open')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasSlot = !!courtId && !!slotId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSlot) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, slotId, title: title.trim(), description: description.trim() || undefined, skillLevel: skill, maxPlayers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/games/${json.game.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (!hasSlot) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🏟</p>
        <p className="font-semibold text-foreground mb-2">Book a court first</p>
        <p className="text-sm text-muted-foreground mb-6">You need a confirmed court booking to post an open game.</p>
        <a href="/player/discover" className={cn(buttonVariants())}>Find a Court →</a>
      </div>
    )
  }

  const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Inter.' },
    { value: 'advanced', label: 'Advanced' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="border-primary/30 bg-secondary">
        <CardContent className="p-4">
          <p className="font-semibold text-foreground">{courtName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{slotDate} · {slotStart} – {slotEnd}</p>
          <p className="text-xs text-primary font-medium mt-1">already booked ✓</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Game title *</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Casual doubles, anyone welcome"
        />
      </div>

      <div>
        <Label className="mb-2 block">Skill level</Label>
        <div className="flex gap-2">
          {SKILL_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => setSkill(o.value)}
              className={cn('flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors',
                skill === o.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Max players</Label>
        <div className="flex gap-2">
          {[2, 4, 6].map(n => (
            <button key={n} type="button" onClick={() => setMaxPlayers(n)}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                maxPlayers === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Bring your own paddle, parking available"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title.trim()} className="w-full" size="lg">
        {loading ? 'Posting…' : 'Post Game →'}
      </Button>
    </form>
  )
}
