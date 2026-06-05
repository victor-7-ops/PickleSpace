import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/ui/sign-out-button'
import Link from 'next/link'

const ADMIN_EMAIL = 'gadianavictor@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-foreground text-background px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
          A
        </div>
        <span className="font-bold text-sm">PickleSpace Admin</span>
        <span className="ml-auto text-xs opacity-50 hidden sm:block">{user.email}</span>
        <SignOutButton redirectTo="/admin/login" className="text-xs text-background/60 hover:text-background transition-colors ml-3">
          Sign out
        </SignOutButton>
      </header>

      {/* Nav tabs */}
      <nav className="bg-foreground border-t border-background/10 px-4 flex gap-1 pb-1">
        {[
          { href: '/admin',        label: '📊 Dashboard' },
          { href: '/admin/courts', label: '🏟 Courts'    },
        ].map(tab => (
          <Link key={tab.href} href={tab.href}
            className="px-3 py-2 text-xs font-semibold text-background/60 hover:text-background transition-colors rounded-t-md hover:bg-background/10">
            {tab.label}
          </Link>
        ))}
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
