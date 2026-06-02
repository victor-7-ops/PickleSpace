'use client'
import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onResult: (code: string) => void
  onClose: () => void
}

export function QRScanner({ onResult, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let animFrame: number

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) videoRef.current.srcObject = stream

        if (!('BarcodeDetector' in window)) {
          setError('Camera scanning not supported on this browser. Enter the code manually below.')
          return
        }

        // @ts-expect-error BarcodeDetector not in TS lib yet
        const detector = new BarcodeDetector({ formats: ['qr_code'] })

        const scan = async () => {
          if (!videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              onResult(codes[0].rawValue)
              return
            }
          } catch {}
          animFrame = requestAnimationFrame(scan)
        }
        animFrame = requestAnimationFrame(scan)
      } catch {
        setError('Camera access denied. Enter the code manually below.')
      }
    }

    start()
    return () => {
      cancelAnimationFrame(animFrame)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [onResult])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-square max-w-xs mx-auto w-full">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white rounded-xl opacity-60" />
        </div>
      </div>

      {error && <p className="text-sm text-yellow-600 text-center">{error}</p>}

      <p className="text-xs text-gray-400 text-center">Or enter the QR code manually:</p>
      <div className="flex gap-2">
        <input value={manualCode} onChange={e => setManualCode(e.target.value)}
          placeholder="Paste booking QR code"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => manualCode && onResult(manualCode)}
          disabled={!manualCode}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40">
          Verify
        </button>
      </div>

      <button onClick={onClose} className="text-sm text-gray-400 text-center hover:text-gray-600">
        Cancel
      </button>
    </div>
  )
}
