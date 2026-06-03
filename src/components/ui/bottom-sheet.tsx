'use client'
import { useEffect } from 'react'

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

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {children}
        </div>
      </div>
    </>
  )
}
