import { createContext } from 'react'
import type { User } from './api'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
  reloadProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)