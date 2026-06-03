import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CreateGameForm } from '@/components/player/CreateGameForm'

interface Props {
  searchParams: { slot?: string; court?: string }
}

export default async function NewGamePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const next = `/games/new${searchParams.slot ? `?slot=${searchParams.slot}&court=${searchParams.court}` : ''}`
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  const slotId = searchParams.slot
  const courtId = searchParams.court

  let slotInfo: { date?: string; start_time?: string; end_time?: string } | null = null
  let courtInfo: { name?: string } | null = null

  if (slotId && courtId) {
    const { data: slot } = await supabase
      .from('slots')
      .select('date, start_time, end_time')
      .eq('id', slotId)
      .single()
    slotInfo = slot

    const { data: court } = await supabase
      .from('courts')
      .select('name')
      .eq('id', courtId)
      .single()
    courtInfo = court
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/player/games" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <span className="font-semibold text-gray-900">Post a Game</span>
      </header>
      <div className="px-4 py-6 max-w-lg mx-auto">
        <CreateGameForm
          courtId={courtId}
          courtName={courtInfo?.name}
          slotId={slotId}
          slotDate={slotInfo?.date}
          slotStart={slotInfo?.start_time}
          slotEnd={slotInfo?.end_time}
        />
      </div>
    </div>
  )
}
