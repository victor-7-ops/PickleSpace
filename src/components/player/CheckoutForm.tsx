'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
        body: JSON.stringify({ slotId, courtId, hours, paymentMethod: method, notes: notes.trim() || undefined }),
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
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-foreground">{courtName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground">{startTime} – {endTime}</p>
          <Separator className="my-3" />
          <p className="text-2xl font-bold text-primary tabular-nums">₱{amount.toLocaleString()}</p>
        </CardContent>
      </Card>

      <div>
        <Label id="payment-method-label" className="mb-2 block">Pay with</Label>
        <div role="group" aria-labelledby="payment-method-label" className="flex gap-3">
          {METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={method === m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                method === m.id
                  ? 'border-primary bg-secondary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <span className="text-xl">{m.icon}</span>
              <span className={cn('text-xs font-semibold', method === m.id ? 'text-primary' : 'text-muted-foreground')}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          Message to court owner{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. I'll arrive 10 mins late"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleConfirm} disabled={loading} className="w-full" size="lg">
        {loading ? 'Processing…' : <span className="tabular-nums">Confirm & Pay ₱{amount.toLocaleString()} →</span>}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {method === 'gcash' || method === 'card'
          ? "You'll be redirected to PayMongo to complete payment"
          : 'Pay at the court on arrival · Court will mark you as paid'}
      </p>
    </div>
  )
}
