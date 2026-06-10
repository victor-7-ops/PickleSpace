'use client'
import { useState } from 'react'
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react'
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
        <span className="text-muted-foreground">
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </span>
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
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden="true" /> {address}
          </p>
        </div>
      )}
    </div>
  )
}
