import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/player/BottomNav'

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'player') redirect('/owner')

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
