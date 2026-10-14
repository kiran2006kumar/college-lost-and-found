import { useEffect, useState, type ReactNode } from 'react'
import { api, jsonBody, type User } from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem('lostlink_token')))

  useEffect(() => {
    if (!sessionStorage.getItem('lostlink_token')) return
    api<User>('/auth/me').then(setUser).catch(() => {
      sessionStorage.removeItem('lostlink_token')
    }).finally(() => setLoading(false))
  }, [])

  async function establishSession(path: string, body: unknown) {
    const result = await api<{ access_token: string; user: User }>(path, { method: 'POST', body: jsonBody(body) })
    sessionStorage.setItem('lostlink_token', result.access_token)
    setUser(result.user)
  }

  async function signIn(email: string, password: string) { await establishSession('/auth/login', { email, password }) }
  async function signUp(name: string, email: string, password: string) { await establishSession('/auth/register', { name, email, password }) }
  function signOut() { sessionStorage.removeItem('lostlink_token'); setUser(null) }
  async function reloadProfile() { setUser(await api<User>('/auth/me')) }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, reloadProfile }}>{children}</AuthContext.Provider>
}
