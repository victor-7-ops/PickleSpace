'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PaymentMethod = 'gcash' | 'card' | 'cash'

interface CheckoutFormProps {
  slotId: string
  courtId: string
  courtName: string
  amount: number
  date: string
  startTime: string
  endTime: string
}

export function CheckoutForm({ slotId, courtId, courtName, amount, date, startTime, endTime }: CheckoutFormProps) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>('gcash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function calcHours(start: string, end: string) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  }

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      const hours = calcHours(startTime, endTime)
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          courtId,
          hours,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const { booking, checkoutUrl } = json

      if (method === 'cash' || !checkoutUrl) {
        router.push(`/bookings/${booking.id}/confirmed`)
      } else {
        window.location.href = checkoutUrl
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'gcash', label: 'GCash', icon: '📱' },
    { id: 'card',  label: 'Card',  icon: '💳' },
    { id: 'cash',  label: 'Cash',  icon: '💵' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Booking summary */}
      <div className="bg-green-50 rounded-2xl p-4">
        <p className="font-semibold text-gray-900">{courtName}</p>
        <p className="text-sm text-gray-600 mt-0.5">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm text-gray-600">{startTime} – {endTime}</p>
        <p className="text-2xl font-bold text-green-700 mt-3">₱{amount.toLocaleString()}</p>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Pay with</p>
        <div className="flex gap-3">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${
                method === m.id
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}>
              <span className="text-xl">{m.icon}</span>
              <span className={`text-xs font-semibold ${method === m.id ? 'text-green-700' : 'text-gray-600'}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Message to court owner <span className="text-gray-400 font-normal">(optional)</span></span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="e.g. I'll arrive 10 mins late"
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={handleConfirm} disabled={loading}
        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
        {loading ? 'Processing…' : `Confirm & Pay ₱${amount.toLocaleString()} →`}
      </button>

      {method === 'gcash' || method === 'card'
        ? <p className="text-xs text-gray-400 text-center">You'll be redirected to PayMongo to complete payment</p>
        : <p className="text-xs text-gray-400 text-center">Pay at the court on arrival · Court will mark you as paid</p>
      }
    </div>
  )
}
