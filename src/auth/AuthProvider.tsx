import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextValue } from '@/auth/AuthContext'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let activo = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session)
      setCargando(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!activo) return
      setSession(nuevaSesion)
      setCargando(false)
      // Al cambiar de usuario (o salir) el cache anterior ya no aplica.
      if (evento === 'SIGNED_OUT' || evento === 'SIGNED_IN') {
        queryClient.clear()
      }
    })

    return () => {
      activo = false
      subscription.subscription.unsubscribe()
    }
  }, [queryClient])

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      cargando,
      iniciarSesion,
      cerrarSesion,
    }),
    [session, cargando, iniciarSesion, cerrarSesion],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
