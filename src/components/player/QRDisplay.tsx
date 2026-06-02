import QRCode from 'qrcode'

interface QRDisplayProps {
  token: string
  courtName: string
  date: string
  startTime: string
  endTime: string
}

export async function QRDisplay({ token, courtName, date, startTime, endTime }: QRDisplayProps) {
  const dataUrl = await QRCode.toDataURL(token, {
    width: 240,
    margin: 2,
    color: { dark: '#111827', light: '#ffffff' },
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <img src={dataUrl} alt="Check-in QR code" className="w-48 h-48" />
      </div>
      <p className="text-sm text-gray-500 text-center">Show this at the court for check-in</p>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{courtName}</p>
        <p className="text-xs text-gray-500">{date} · {startTime} – {endTime}</p>
      </div>
    </div>
  )
}
