const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const isDemoMode = !API_BASE

export async function apiRequest(path, options = {}) {
  const normalizedPath =
    API_BASE.endsWith('/api') && path.startsWith('/api') ? path.slice(4) : path
  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || 'Terjadi kesalahan. Silakan coba lagi.')
    error.status = response.status
    throw error
  }
  return body
}
