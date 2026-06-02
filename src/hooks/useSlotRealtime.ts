import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Slot } from '@/types'

// Subscribes to real-time slot changes for a given court + date.
export function useSlotRealtime(courtId: string, date: string) {
  const [slots, setSlots] = useState<Slot[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    supabase
      .from('slots')
      .select('*')
      .eq('court_id', courtId)
      .eq('date', date)
      .order('start_time')
      .then(({ data }) => { if (data) setSlots(data) })

    // Realtime subscription
    const channel = supabase
      .channel(`slots:${courtId}:${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `court_id=eq.${courtId}` },
        (payload) => {
          setSlots(prev => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new as Slot]
            if (payload.eventType === 'UPDATE')
              return prev.map(s => s.id === payload.new.id ? payload.new as Slot : s)
            if (payload.eventType === 'DELETE')
              return prev.filter(s => s.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [courtId, date])

  return slots
}
