import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-2xl mx-auto flex">
          {[
            { href: '/player/discover', label: 'Discover', icon: '🏟' },
            { href: '/player/games',   label: 'Games',    icon: '🏓' },
            { href: '/player/bookings', label: 'Bookings', icon: '📅' },
          ].map(tab => (
            <Link key={tab.href} href={tab.href}
              className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-green-600 transition-colors">
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
