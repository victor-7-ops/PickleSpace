'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type UserSkillLevel = 'beginner' | 'intermediate' | 'advanced'

const SKILL_OPTIONS: { value: UserSkillLevel; label: string; description: string }[] = [
  { value: 'beginner',     label: 'Beginner',     description: 'Learning the basics, played under a year' },
  { value: 'intermediate', label: 'Intermediate', description: 'Consistent rallies, understand strategy' },
  { value: 'advanced',     label: 'Advanced',     description: 'Tournament-level, strong dinking game' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<UserSkillLevel | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(level: UserSkillLevel | null) {
    setSaving(true)
    if (level) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ skill_level: level }).eq('id', user.id)
      }
    }
    router.push('/player/games')
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto py-8 px-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">What's your skill level?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We'll show you matching games. You can change this anytime.
        </p>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Skill level">
        {SKILL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected === opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            )}
          >
            <p className="font-semibold text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="power"
          size="lg"
          disabled={!selected || saving}
          onClick={() => selected && handleSave(selected)}
          className="w-full"
        >
          {saving ? 'Saving…' : 'Save & find games'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => handleSave(null)}
          className="w-full"
        >
          Skip for now
        </Button>
      </div>
    </div>
  )
}
