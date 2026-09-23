import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { SyncCorrida } from '@/types/database'

/** Umbral a partir del cual consideramos que los datos están desactualizados. */
export const MINUTOS_ALERTA = 120

async function fetchUltimaSync(): Promise<SyncCorrida | null> {
  const { data, error } = await supabase
    .from('sync_corrida')
    .select('*')
    .order('iniciada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export function useUltimaSync() {
  return useQuery({
    queryKey: ['sync', 'ultima'],
    queryFn: fetchUltimaSync,
    // La sincronización corre del lado del backend: refrescamos solos cada 5 minutos.
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  })
}
