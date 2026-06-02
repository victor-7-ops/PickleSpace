'use client'
import { useState } from 'react'

interface CourtAboutProps {
  description?: string
  amenities: string[]
  address: string
  images: string[]
}

export function CourtAbout({ description, amenities, address, images }: CourtAboutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-gray-100 mt-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-sm font-semibold text-gray-700">
        About this court
        <span className="text-gray-400">{open ? '▲' : '▾'}</span>
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
          {description && <p className="text-sm text-gray-600">{description}</p>}
          {amenities.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {amenities.map(a => (
                <span key={a} className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{a}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">📍 {address}</p>
        </div>
      )}
    </div>
  )
}
