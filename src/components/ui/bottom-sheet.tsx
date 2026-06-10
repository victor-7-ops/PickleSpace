'use client'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { slideUp } from '@/lib/motion'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card elevation-3 rounded-t-2xl max-h-[90vh] flex flex-col"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">{title}</h2>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-2xl leading-none w-11 h-11 -mr-1.5 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </motion.button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
