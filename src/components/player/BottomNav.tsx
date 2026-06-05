'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/player/discover', label: 'Discover', icon: '🏟' },
  { href: '/player/games',    label: 'Games',    icon: '🏓' },
  { href: '/player/bookings', label: 'Bookings', icon: '📅' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-2xl mx-auto flex">
        {TABS.map(tab => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Sliding active indicator — layoutId shared across tabs */}
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={cn('text-[10px] font-semibold', isActive ? 'text-primary' : '')}>
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Sign out */}
        <form method="POST" action="/api/auth/signout?redirect=/login" className="flex-1">
          <button type="submit"
            className="w-full min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-xl leading-none">🚪</span>
            <span className="text-[10px] font-semibold">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
