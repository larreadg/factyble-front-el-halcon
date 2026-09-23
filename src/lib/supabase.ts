import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env.local y completalos.',
  )
}

/**
 * Cliente único de la app. Sólo la anon key: todo el acceso está mediado por RLS
 * y es de lectura.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

/**
 * Los errores de PostgREST por sesión vencida llegan como `PGRST301` / `PGRST302`
 * o con "JWT" en el mensaje. Los detectamos para cerrar sesión y volver al login
 * en vez de mostrar un error críptico.
 *
 * Ojo: `42501` ("permission denied") NO entra acá. Si faltara un GRANT para el rol
 * `authenticated`, tratarlo como sesión vencida desloguearía al usuario en loop;
 * es un problema de permisos en la base y tiene que verse como error.
 */
export function esErrorDeSesion(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  if (typeof code === 'string' && ['PGRST301', 'PGRST302'].includes(code)) return true
  if (typeof message !== 'string') return false
  const normalizado = message.toLowerCase()
  return (
    normalizado.includes('jwt') ||
    normalizado.includes('token is expired') ||
    normalizado.includes('invalid claim') ||
    normalizado.includes('session_not_found')
  )
}
