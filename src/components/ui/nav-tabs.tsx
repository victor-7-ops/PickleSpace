'use client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface NavTab {
  key: string
  label: string
  href: string
}

interface NavTabsProps {
  tabs: NavTab[]
  current: string
  className?: string
}

/**
 * URL-based tabs styled to match shadcn <Tabs> pill appearance.
 * Uses <Link> for navigation — keeps server-side data fetching intact.
 */
export function NavTabs({ tabs, current, className }: NavTabsProps) {
  return (
    <div
      className={cn(
        'inline-flex w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-4',
        className
      )}
    >
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            'flex-1 inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all',
            current === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
