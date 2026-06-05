'use client'
import { createClient } from '@/lib/supabase/client'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button onClick={handleSignOut} className={className}>
      {children ?? 'Sign out'}
    </button>
  )
}
