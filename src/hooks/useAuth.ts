import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase/client'
import { getAppUrl } from '../lib/appUrl'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const requestEmailOtp = async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const redirectTo = `${getAppUrl()}/settings`
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
  }

  const verifyEmailOtp = async (email: string, token: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    session,
    loading,
    configured: isSupabaseConfigured,
    requestEmailOtp,
    verifyEmailOtp,
    signOut,
  }
}
