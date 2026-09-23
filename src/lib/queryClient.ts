import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { esErrorDeSesion, supabase } from '@/lib/supabase'

/**
 * Si el token venció, cerramos sesión: `onAuthStateChange` dispara el redirect al
 * login sin que cada pantalla tenga que ocuparse del caso.
 */
function manejarErrorGlobal(error: unknown): void {
  if (!esErrorDeSesion(error)) return
  void supabase.auth.signOut()
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: manejarErrorGlobal }),
  mutationCache: new MutationCache({ onError: manejarErrorGlobal }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (esErrorDeSesion(error)) return false
        return failureCount < 2
      },
    },
  },
})
