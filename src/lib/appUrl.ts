/** Canonical app origin for auth redirects (falls back to current page in the browser). */
export function getAppUrl(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
