import { Resend } from 'resend'

const FROM = 'PickleSpace <noreply@picklespace.ph>'

// Lazy init — avoids crashing at build time when env var isn't present
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

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
  return getResend().emails.send({
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

// Per-head open-play confirmation — QR code is the game_players row id,
// scanned by the owner at check-in.
export async function sendGamePlayerConfirmation(opts: {
  to: string
  playerName: string
  gameTitle: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  amount: number          // PHP
  qrCode: string          // game_players.id
}) {
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `You're in — ${opts.gameTitle}`,
    html: `
      <h2>You're confirmed for ${opts.gameTitle}!</h2>
      <p>Hi ${opts.playerName},</p>
      <p><strong>${opts.courtName}</strong></p>
      <p>${opts.date} · ${opts.startTime} – ${opts.endTime}</p>
      <p>Amount paid: ₱${opts.amount.toLocaleString()}</p>
      <p>Show this QR code to the host at check-in:</p>
      <p style="font-size:24px;letter-spacing:4px;font-family:monospace">${opts.qrCode}</p>
    `,
  })
}

// Sent when a waitlisted player is promoted into an open spot.
export async function sendGamePromotion(opts: {
  to: string
  playerName: string
  gameTitle: string
  courtName: string
  date: string
  startTime: string
  pricePerHead: number    // centavos
  gameId: string
}) {
  const needsPayment = opts.pricePerHead > 0
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `A spot opened up — ${opts.gameTitle}`,
    html: `
      <h2>You're off the waitlist!</h2>
      <p>Hi ${opts.playerName}, a spot just opened for <strong>${opts.gameTitle}</strong> at ${opts.courtName} on ${opts.date} · ${opts.startTime}.</p>
      ${needsPayment
        ? `<p>You're now <strong>joined</strong> — please confirm your ₱${(opts.pricePerHead / 100).toLocaleString()} payment to secure your spot.</p>`
        : `<p>You're now <strong>joined</strong>. See you on the court!</p>`}
      <p><a href="https://picklespace.ph/games/${opts.gameId}">View game</a></p>
    `,
  })
}

// Sent to game host when a player requests to join (auto_join=false)
export async function sendHostJoinRequest(opts: {
  to: string
  hostName: string
  requesterName: string
  gameTitle: string
  gameId: string
}) {
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Join request for ${opts.gameTitle}`,
    html: `
      <h2>${opts.requesterName} wants to join your game</h2>
      <p>Hi ${opts.hostName}, <strong>${opts.requesterName}</strong> has requested to join <strong>${opts.gameTitle}</strong>.</p>
      <p><a href="https://picklespace.ph/games/${opts.gameId}">Review and approve on PickleSpace →</a></p>
    `,
  })
}

// Sent to player when the host approves their join request
export async function sendPlayerApproved(opts: {
  to: string
  playerName: string
  gameTitle: string
  courtName: string
  date: string
  startTime: string
  checkoutUrl?: string   // present for paid games; absent for cash/free
  pricePerHead?: number  // PHP
}) {
  const hasPay = !!opts.checkoutUrl
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `You're approved — ${opts.gameTitle}`,
    html: `
      <h2>Your spot is approved!</h2>
      <p>Hi ${opts.playerName}, the host approved your request for <strong>${opts.gameTitle}</strong> at ${opts.courtName} on ${opts.date} · ${opts.startTime}.</p>
      ${hasPay
        ? `<p>Please complete your ₱${opts.pricePerHead?.toLocaleString()} payment to confirm your spot:</p>
           <p><a href="${opts.checkoutUrl}" style="background:#84cc16;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Pay now →</a></p>`
        : `<p>See you on the court! No payment required — pay cash to the host on the day.</p>`}
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
  return getResend().emails.send({
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
