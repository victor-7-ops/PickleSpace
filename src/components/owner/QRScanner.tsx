'use client'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
            if (codes.length > 0) { onResult(codes[0].rawValue); return }
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
        <video ref={videoRef} autoPlay playsInline muted aria-label="Camera viewfinder for QR code scanning" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white rounded-xl opacity-60" />
        </div>
      </div>

      {error && <p className="text-sm text-yellow-600 text-center">{error}</p>}

      <p className="text-xs text-muted-foreground text-center">Or enter the QR code manually:</p>
      <div className="flex gap-2">
        <Input
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          placeholder="Paste booking QR code"
          name="qr-code"
          autoComplete="off"
          spellCheck={false}
          aria-label="Booking QR code"
          className="flex-1"
        />
        <Button onClick={() => manualCode && onResult(manualCode)} disabled={!manualCode}>
          Verify
        </Button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-sm text-muted-foreground text-center hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Cancel
      </button>
    </div>
  )
}
