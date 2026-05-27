const OTP_COOLDOWN_MS = 60_000

const OTP_REQUEST_KEY = 'libro:lastOtpRequest'

interface OtpRequestRecord {
  email: string
  at: number
}

export function readLastOtpRequest(): OtpRequestRecord | null {
  try {
    const raw = sessionStorage.getItem(OTP_REQUEST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OtpRequestRecord
    if (!parsed.email || !parsed.at) return null
    return parsed
  } catch {
    return null
  }
}

export function writeLastOtpRequest(email: string) {
  sessionStorage.setItem(
    OTP_REQUEST_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() } satisfies OtpRequestRecord),
  )
}

export function secondsUntilOtpResend(email: string): number {
  const last = readLastOtpRequest()
  if (!last || last.email !== email.trim().toLowerCase()) return 0
  const elapsed = Date.now() - last.at
  return Math.max(0, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000))
}

export function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('rate limit') || lower.includes('too many requests')
}

export function friendlyAuthError(message: string): string {
  if (isRateLimitError(message)) {
    return 'Too many sign-in emails were sent. Supabase allows only a few per hour on the default email service — wait about an hour, or set up custom SMTP in Supabase. If you already received a code, tap “Enter code instead”.'
  }
  return message
}
