import { useEffect, useRef, useState } from 'react'

const RESEND_COOLDOWN_SEC = 60

interface CloudSyncSignInProps {
  onRequestCode: (email: string) => Promise<void>
  onVerifyCode: (email: string, code: string) => Promise<void>
}

export function CloudSyncSignIn({ onRequestCode, onVerifyCode }: CloudSyncSignInProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => {
      setResendIn((seconds) => seconds - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    if (codeSent) {
      codeInputRef.current?.focus()
    }
  }, [codeSent])

  const startCooldown = () => setResendIn(RESEND_COOLDOWN_SEC)

  const handleSendCode = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await onRequestCode(email)
      setCodeSent(true)
      setCode('')
      startCooldown()
      setMessage(`Enter the 6-digit code sent to ${email.trim()}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send sign-in code')
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (resendIn > 0) return
    await handleSendCode()
  }

  const handleVerify = async (token: string) => {
    if (token.length !== 6 || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await onVerifyCode(email, token)
      setMessage('Signed in. Syncing your library…')
    } catch (e) {
      setCode('')
      setError(e instanceof Error ? e.message : 'Invalid or expired code')
      codeInputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError(null)
    if (digits.length === 6) {
      void handleVerify(digits)
    }
  }

  const handleUseDifferentEmail = () => {
    setCodeSent(false)
    setCode('')
    setError(null)
    setMessage(null)
    setResendIn(0)
  }

  if (!codeSent) {
    return (
      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          className="w-full rounded-lg border border-libro-border bg-libro-bg px-4 py-3"
        />
        <button
          type="button"
          onClick={() => void handleSendCode()}
          disabled={!email.trim() || busy}
          className="w-full rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send sign-in code'}
        </button>
        <p className="text-xs text-libro-muted">
          Works in the installed app on iPhone — enter the code here instead of tapping an email
          link.
        </p>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-libro-muted">
        Code sent to <span className="font-medium text-libro-text">{email.trim()}</span>
      </p>
      <input
        ref={codeInputRef}
        type="text"
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        placeholder="000000"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={busy}
        aria-label="6-digit sign-in code"
        className="w-full rounded-lg border border-libro-border bg-libro-bg px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] tabular-nums"
      />
      <button
        type="button"
        onClick={() => void handleVerify(code)}
        disabled={code.length !== 6 || busy}
        className="w-full rounded-lg bg-libro-accent px-4 py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {busy ? 'Verifying…' : 'Verify code'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleUseDifferentEmail}
          className="text-libro-muted underline-offset-2 hover:text-libro-text hover:underline"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resendIn > 0 || busy}
          className="text-libro-muted underline-offset-2 hover:text-libro-text hover:underline disabled:opacity-50"
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
        </button>
      </div>
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
