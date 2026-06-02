import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'PickleSpace <noreply@picklespace.ph>'

export async function sendBookingConfirmation(opts: {
  to: string
  playerName: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  amount: number
  qrCode: string
  bookingId: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Booking Confirmed — ${opts.courtName}`,
    html: `
      <h2>Your booking is confirmed!</h2>
      <p>Hi ${opts.playerName},</p>
      <p><strong>${opts.courtName}</strong></p>
      <p>${opts.date} · ${opts.startTime} – ${opts.endTime}</p>
      <p>Amount paid: ₱${opts.amount.toLocaleString()}</p>
      <p>Show this QR code at the court for check-in:</p>
      <p style="font-size:24px;letter-spacing:4px;font-family:monospace">${opts.qrCode}</p>
      <p>Booking ID: ${opts.bookingId}</p>
    `,
  })
}

export async function sendBookingCancellation(opts: {
  to: string
  playerName: string
  courtName: string
  date: string
  refundAmount?: number
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Booking Cancelled — ${opts.courtName}`,
    html: `
      <h2>Booking Cancelled</h2>
      <p>Hi ${opts.playerName}, your booking at <strong>${opts.courtName}</strong> on ${opts.date} has been cancelled.</p>
      ${opts.refundAmount ? `<p>Refund of ₱${opts.refundAmount.toLocaleString()} will be processed within 3–5 business days.</p>` : ''}
    `,
  })
}
