'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { Compass, Swords, CalendarDays, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/player/discover', label: 'Discover', Icon: Compass },
  { href: '/player/games',    label: 'Games',    Icon: Swords  },
  { href: '/player/bookings', label: 'Bookings', Icon: CalendarDays },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 glass border-t-0 shadow-lg z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-2xl mx-auto flex">
        {/* Navigation tabs */}
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={cn(
                'flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />
              <span className={cn('text-[10px] font-semibold', isActive ? 'text-primary' : '')}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Sign out — visually separated from navigation items per P9 destructive-nav-separation */}
        <div className="w-px bg-border/50 my-3 flex-shrink-0" aria-hidden="true" />
        <form method="POST" action="/api/auth/signout?redirect=/login" className="flex-1">
          <button
            type="submit"
            aria-label="Sign out"
            className="w-full min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[10px] font-semibold">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
