import type { Session, User } from '@supabase/supabase-js'
import { createContext, use } from 'react'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  /** `true` hasta que sabemos si hay sesión persistida; evita el parpadeo del login. */
  cargando: boolean
  iniciarSesion: (email: string, password: string) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}
