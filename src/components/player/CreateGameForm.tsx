'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SkillLevel = 'open' | 'beginner' | 'intermediate' | 'advanced'

interface CreateGameFormProps {
  courtId?: string
  courtName?: string
  slotId?: string
  slotDate?: string
  slotStart?: string
  slotEnd?: string
}

export function CreateGameForm({
  courtId, courtName, slotId, slotDate, slotStart, slotEnd,
}: CreateGameFormProps) {
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
        body: JSON.stringify({
          courtId,
          slotId,
          title: title.trim(),
          description: description.trim() || undefined,
          skillLevel: skill,
          maxPlayers,
        }),
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
        <p className="font-semibold text-gray-900 mb-2">Book a court first</p>
        <p className="text-sm text-gray-500 mb-6">
          You need a confirmed court booking to post an open game.
        </p>
        <a href="/player/discover"
          className="bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
          Find a Court →
        </a>
      </div>
    )
  }

  const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
    { value: 'open',         label: 'Open' },
    { value: 'beginner',     label: 'Beginner' },
    { value: 'intermediate', label: 'Inter.' },
    { value: 'advanced',     label: 'Advanced' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <p className="font-semibold text-gray-900">{courtName}</p>
        <p className="text-sm text-gray-600 mt-0.5">{slotDate} · {slotStart} – {slotEnd}</p>
        <p className="text-xs text-green-700 font-medium mt-1">already booked ✓</p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-700">Game title *</span>
        <input required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Casual doubles, anyone welcome"
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Skill level</p>
        <div className="flex gap-2">
          {SKILL_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => setSkill(o.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                skill === o.value ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Max players</p>
        <div className="flex gap-2">
          {[2, 4, 6].map(n => (
            <button key={n} type="button" onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                maxPlayers === n ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-700">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="e.g. Bring your own paddle, parking available"
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading || !title.trim()}
        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
        {loading ? 'Posting…' : 'Post Game →'}
      </button>
    </form>
  )
}
