import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { PantallaCargando } from '@/components/ui/PantallaCargando'

/** Sin sesión redirige a /login y recuerda a dónde quería ir el usuario. */
export function ProtectedRoute() {
  const { session, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <PantallaCargando />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

/** Con sesión activa, /login vuelve al destino pedido (o al inicio). */
export function PublicOnlyRoute() {
  const { session, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <PantallaCargando />

  if (session) {
    const state = location.state as { from?: { pathname?: string } } | null
    return <Navigate to={state?.from?.pathname ?? '/'} replace />
  }

  return <Outlet />
}
