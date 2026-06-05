'use client'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
  redirectTo?: string
}

/**
 * Signs out via POST /api/auth/signout — server-side, works in all browsers.
 */
export function SignOutButton({ className, children, redirectTo = '/login' }: SignOutButtonProps) {
  return (
    <form method="POST" action={`/api/auth/signout?redirect=${encodeURIComponent(redirectTo)}`}>
      <button type="submit" className={className}>
        {children ?? 'Sign out'}
      </button>
    </form>
  )
}
