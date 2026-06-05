'use client'
import { useState } from 'react'
import { Separator } from '@/components/ui/separator'

interface CourtAboutProps {
  description?: string
  amenities: string[]
  address: string
  images: string[]
}

export function CourtAbout({ description, amenities, address, images }: CourtAboutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <Separator />
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-sm font-semibold text-foreground">
        About this court
        <span className="text-muted-foreground">{open ? '▲' : '▾'}</span>
      </button>
      {open && (
        <div className="pb-4 flex flex-col gap-3">
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <img key={i} src={url} alt="" className="h-24 w-36 object-cover rounded-xl flex-shrink-0" />
              ))}
            </div>
          )}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {amenities.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {amenities.map(a => (
                <span key={a} className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{a}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">📍 {address}</p>
        </div>
      )}
    </div>
  )
}
