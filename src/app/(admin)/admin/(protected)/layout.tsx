import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'gadianavictor@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-foreground text-background px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold">
          A
        </div>
        <span className="font-bold text-sm">PickleSpace Admin</span>
        <span className="ml-auto text-xs opacity-60">{user.email}</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
