import { createContext, useContext } from 'react'
import type { SessionResponse } from '@/types/marketplace'

export interface AuthState {
  status: 'checking' | 'authenticated' | 'anonymous' | 'error' | 'signing-out'
  session: SessionResponse | undefined
  error: Error | null
  retry: () => void
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider ausente.')
  return auth
}
