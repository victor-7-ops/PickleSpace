'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Swords, LandPlot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'player' | 'owner'>('player')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      })
      if (error) {
        setError(error.message)
        return
      }
      window.location.href = role === 'owner' ? '/owner/courts' : '/player/onboarding'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-court-800 flex flex-col items-center justify-center px-4 py-10">
      {/* Brand panel — navy court, lime ball */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <span className="w-4 h-4 rounded-full bg-court-800" />
        </div>
        <span className="font-display text-3xl uppercase text-white tracking-wide" translate="no">PickleSpace</span>
      </div>
      <Card className="w-full max-w-sm court-line">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join the Cebu pickleball scene</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan dela Cruz"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-describedby={error ? 'register-error' : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id="role-label">I am a…</Label>
              <div className="flex gap-2" role="group" aria-labelledby="role-label">
                {(['player', 'owner'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 min-h-[44px] py-2 rounded-full text-sm font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      role === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {r === 'player'
                      ? <><Swords size={15} aria-hidden="true" /> Player</>
                      : <><LandPlot size={15} aria-hidden="true" /> Court Owner</>}
                  </button>
                ))}
              </div>
            </div>
            {error && <p id="register-error" role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="power" size="lg" disabled={loading} className="w-full gap-2">
              {loading && (
                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
