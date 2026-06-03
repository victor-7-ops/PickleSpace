'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import type { Court } from '@/types'

const AMENITY_OPTIONS = ['Parking', 'Shower', 'Night Lights', 'Restroom', 'Water Station']

interface CourtSheetProps {
  open: boolean
  onClose: () => void
  court?: Court
}

interface FormState {
  name: string
  address: string
  city: string
  description: string
  hourly_rate: string
  amenities: string[]
  images: File[]
}

const EMPTY: FormState = {
  name: '', address: '', city: 'Cebu City', description: '',
  hourly_rate: '', amenities: [], images: [],
}

export function CourtSheet({ open, onClose, court }: CourtSheetProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(
    court
      ? { name: court.name, address: court.address, city: court.city,
          description: court.description ?? '', hourly_rate: String(court.hourly_rate),
          amenities: court.amenities, images: [] }
      : EMPTY
  )

  function set(key: keyof FormState, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleAmenity(a: string) {
    set('amenities', form.amenities.includes(a)
      ? form.amenities.filter(x => x !== a)
      : [...form.amenities, a]
    )
  }

  async function uploadImages(courtId: string): Promise<string[]> {
    if (form.images.length === 0) return court?.images ?? []
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const urls: string[] = []
    for (const file of form.images) {
      const ext = file.name.split('.').pop()
      const path = `courts/${courtId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('court-images').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('court-images').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return [...(court?.images ?? []), ...urls]
  }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      const method = court ? 'PATCH' : 'POST'
      const url = court ? `/api/courts/${court.id}` : '/api/courts'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, address: form.address, city: form.city,
          description: form.description,
          hourly_rate: Number(form.hourly_rate),
          amenities: form.amenities,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const courtId = json.court.id
      if (form.images.length > 0) {
        const imageUrls = await uploadImages(courtId)
        await fetch(`/api/courts/${courtId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imageUrls }),
        })
      }

      router.refresh()
      onClose()
      setStep(0)
      setForm(EMPTY)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const STEPS = [
    {
      title: 'Basic Info',
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Court name *</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cebu Pickle Arena" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Address *</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">City</span>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.city} onChange={e => set('city', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe your court..." />
          </label>
        </div>
      ),
      valid: form.name.trim() !== '' && form.address.trim() !== '',
    },
    {
      title: 'Pricing',
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Hourly rate (₱) *</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
              <input type="number" min="0" className="border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="500" />
            </div>
          </label>
          <p className="text-xs text-gray-400">PickleSpace charges a 10% platform fee per booking. Players pay the full rate; you receive 90%.</p>
        </div>
      ),
      valid: Number(form.hourly_rate) > 0,
    },
    {
      title: 'Amenities',
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Select all that apply:</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button key={a} type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.amenities.includes(a)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-700 hover:border-green-400'
                }`}
              >{a}</button>
            ))}
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: 'Photos',
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Upload up to 6 photos of your court.</p>
          <input type="file" accept="image/*" multiple
            onChange={e => {
              const files = Array.from(e.target.files ?? []).slice(0, 6)
              set('images', files)
            }}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-sm" />
          {form.images.length > 0 && (
            <p className="text-xs text-gray-400">{form.images.length} file{form.images.length > 1 ? 's' : ''} selected</p>
          )}
          {court && court.images.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-1">
              {court.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>
      ),
      valid: true,
    },
  ]

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Sheet open={open} onClose={onClose} title={court ? 'Edit Court' : 'Add Court'}>
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-green-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <h3 className="font-medium text-gray-900 mb-4">{currentStep.title}</h3>
      {currentStep.content}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button
          disabled={!currentStep.valid || saving}
          onClick={isLast ? handleSubmit : () => setStep(s => s + 1)}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          {saving ? 'Saving...' : isLast ? (court ? 'Save Changes' : 'List Court') : 'Next →'}
        </button>
      </div>

      {!court && isLast && (
        <p className="mt-3 text-xs text-center text-gray-400">Your court will be reviewed and activated within 24 hours.</p>
      )}
    </Sheet>
  )
}
