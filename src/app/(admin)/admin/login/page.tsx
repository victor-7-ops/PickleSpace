'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ADMIN_EMAIL = 'gadianavictor@gmail.com'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (email !== ADMIN_EMAIL) {
      setError('Access denied.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    window.location.href = '/admin/courts'
  }

  return (
    <div className="min-h-screen bg-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
            A
          </div>
          <div>
            <p className="font-bold text-background text-sm leading-none">PickleSpace</p>
            <p className="text-xs text-background/50 mt-0.5">Admin Panel</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-background/70 text-xs uppercase tracking-wide">Email</Label>
            <Input
              id="admin-email"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@picklespace.com"
              aria-describedby={error ? 'admin-error' : undefined}
              className="bg-background/10 border-background/20 text-background placeholder:text-background/30 focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password" className="text-background/70 text-xs uppercase tracking-wide">Password</Label>
            <Input
              id="admin-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background/10 border-background/20 text-background placeholder:text-background/30 focus-visible:ring-primary"
            />
          </div>

          {error && (
            <p id="admin-error" role="alert" className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
