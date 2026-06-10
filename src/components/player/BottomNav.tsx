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
      className="fixed bottom-0 left-0 right-0 bg-sidebar text-sidebar-foreground elevation-3 z-40"
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
                'flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset',
                isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-sidebar-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />
              <span className={cn('text-[10px] font-semibold', isActive ? 'text-sidebar-primary' : '')}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Sign out — visually separated from navigation items per P9 destructive-nav-separation */}
        <div className="w-px bg-sidebar-border my-3 flex-shrink-0" aria-hidden="true" />
        <form method="POST" action="/api/auth/signout?redirect=/login" className="flex-1">
          <button
            type="submit"
            aria-label="Sign out"
            className="w-full min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[10px] font-semibold">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
