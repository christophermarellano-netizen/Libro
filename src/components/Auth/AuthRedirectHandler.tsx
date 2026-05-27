import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase/client'

function hasAuthHash(): boolean {
  const hash = window.location.hash
  return hash.includes('access_token=') || hash.includes('error=') || hash.includes('error_code=')
}

function getAuthHashError(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  return params.get('error_description') ?? params.get('error')
}

function clearAuthHash() {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

interface AuthRedirectHandlerProps {
  children: ReactNode
}

export function AuthRedirectHandler({ children }: AuthRedirectHandlerProps) {
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(() => Boolean(supabase && hasAuthHash()))
  const [error, setError] = useState<string | null>(() => getAuthHashError())

  useEffect(() => {
    if (!supabase || !hasAuthHash()) return

    const hashError = getAuthHashError()
    if (hashError) {
      clearAuthHash()
      setError(hashError)
      setProcessing(false)
      return
    }

    let settled = false

    const finish = (signedIn: boolean) => {
      if (settled || !signedIn) return
      settled = true
      clearAuthHash()
      if (window.location.pathname !== '/settings') {
        navigate('/settings', { replace: true })
      }
      setProcessing(false)
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        finish(true)
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      finish(Boolean(session))
    })

    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      clearAuthHash()
      setError('Sign-in timed out. Request a new magic link from Settings.')
      setProcessing(false)
    }, 10000)

    return () => {
      window.clearTimeout(timeout)
      subscription.subscription.unsubscribe()
    }
  }, [navigate])

  if (processing) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-libro-bg px-6 text-center text-libro-muted">
        Signing you in…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-libro-bg px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            navigate('/settings', { replace: true })
          }}
          className="rounded-lg bg-libro-accent px-4 py-2 text-sm font-medium text-white"
        >
          Back to Settings
        </button>
      </div>
    )
  }

  return <>{children}</>
}
