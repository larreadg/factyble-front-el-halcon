import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { EstadoPresentacion, SorteoParticipante, SorteoResultado } from '@/types/database'

/**
 * La ejecución del sorteo: el bolillero, las actas y el acto de sortear.
 *
 * ── Lo que este archivo NO hace, y es el punto ─────────────────────────────
 * No elige ganadores. Ni siquiera sabe cómo. El ganador lo elige
 * `sorteo_ejecutar_premio` dentro de la base, con `gen_random_bytes`, y escribe
 * el acta en la misma transacción.
 *
 * Si el azar viviera acá, quien opera el sorteo podría recargar hasta que salga
 * el ganador que le gusta y nadie podría demostrar que no lo hizo. Con la
 * decisión del lado de la base y un `unique (premio_id)`, la primera ejecución
 * es la única: el segundo intento falla, no repite.
 *
 * La animación de la pantalla revela algo que ya está escrito. Es teatro, y está
 * bien que lo sea — el hecho es la fila.
 *
 * Ver `factyble-back/supabase/schema_sorteo_ejecucion.sql`.
 */

export const clavesEjecucion = {
  participantes: (sorteoId: number) => ['sorteo-ejecucion', 'participantes', sorteoId] as const,
  resultados: (sorteoId: number) => ['sorteo-ejecucion', 'resultados', sorteoId] as const,
  estado: (sorteoId: number) => ['sorteo-ejecucion', 'estado', sorteoId] as const,
}

/**
 * El bolillero, tal como está ahora.
 *
 * Sale de la MISMA función que usa la ejecución. Que la pantalla muestre una
 * lista y la base sortee sobre otra sería un sorteo impugnable, así que no hay
 * dos consultas: hay una, y las dos la llaman.
 *
 * `staleTime: 0` a propósito: después de cada premio el bolillero cambia —el
 * ganador sale— y mostrar el anterior sería mentir sobre cuántos participan.
 */
export function useParticipantes(sorteoId: number | undefined) {
  return useQuery({
    queryKey: clavesEjecucion.participantes(sorteoId ?? 0),
    queryFn: async (): Promise<SorteoParticipante[]> => {
      const { data, error } = await supabase.rpc('sorteo_participantes', {
        p_sorteo_id: sorteoId as number,
      })
      if (error) throw error
      return data
    },
    enabled: sorteoId !== undefined,
    staleTime: 0,
  })
}

/** Las actas ya escritas de este sorteo, con el premio y el contacto resueltos. */
export function useResultados(sorteoId: number | undefined) {
  return useQuery({
    queryKey: clavesEjecucion.resultados(sorteoId ?? 0),
    queryFn: async (): Promise<SorteoResultado[]> => {
      const { data, error } = await supabase
        .from('v_sorteo_resultado')
        .select('*')
        .eq('sorteo_id', sorteoId as number)
        .order('premio_orden', { ascending: true })
        .returns<SorteoResultado[]>()
      if (error) throw error
      return data
    },
    enabled: sorteoId !== undefined,
  })
}

/**
 * Sortea un premio.
 *
 * Devuelve el acta ya leída, no el id: la pantalla necesita el ganador completo
 * para revelarlo, y pedirlo en dos pasos dejaría un instante en el que el sorteo
 * está hecho y la pantalla no sabe de quién.
 *
 * No lleva reintentos. Un reintento automático sobre algo que YA se ejecutó
 * chocaría contra el `unique (premio_id)` y mostraría un error de "ya se
 * sorteó" sobre un sorteo que acaba de salir bien.
 */
export function useSortearPremio(sorteoId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: async (premioId: number): Promise<SorteoResultado> => {
      const { data: actaId, error } = await supabase.rpc('sorteo_ejecutar_premio', {
        p_premio_id: premioId,
      })
      if (error) throw error

      const { data, error: errorActa } = await supabase
        .from('v_sorteo_resultado')
        .select('*')
        .eq('id', actaId)
        .single<SorteoResultado>()
      if (errorActa) throw errorActa
      return data
    },
    onSuccess: () => {
      if (sorteoId === undefined) return
      // El bolillero perdió al ganador y el sorteo pudo pasar a SORTEADO: las
      // cuatro cosas cambian a la vez. `estado` incluida: de ahí salen el
      // contador de facturas elegibles y —después del último premio— el slug de
      // la página pública, que el podio necesita para dibujar el QR.
      void queryClient.invalidateQueries({ queryKey: clavesEjecucion.participantes(sorteoId) })
      void queryClient.invalidateQueries({ queryKey: clavesEjecucion.resultados(sorteoId) })
      void queryClient.invalidateQueries({ queryKey: clavesEjecucion.estado(sorteoId) })
      void queryClient.invalidateQueries({ queryKey: ['sorteos'] })
    },
  })
}

/**
 * El estado completo de la pantalla, en una consulta.
 *
 * Es lo que permite RECARGAR a mitad de un sorteo y retomar donde estaba: el
 * bolillero congelado, los hashes, cuántos premios faltan y si la semilla ya se
 * reveló viven en el servidor, no en el navegador.
 */
export function useEstadoPresentacion(sorteoId: number | undefined) {
  return useQuery({
    queryKey: clavesEjecucion.estado(sorteoId ?? 0),
    queryFn: async (): Promise<EstadoPresentacion | null> => {
      const { data, error } = await supabase.rpc('sorteo_estado_presentacion', {
        p_sorteo_id: sorteoId as number,
      })
      if (error) throw error
      return data[0] ?? null
    },
    enabled: sorteoId !== undefined,
    staleTime: 0,
  })
}

/**
 * Congela el bolillero y publica el compromiso de la semilla.
 *
 * Se llama al entrar a la pantalla, antes del primer premio. Es idempotente, así
 * que volver a entrar no rehace nada — y eso importa: si el bolillero se
 * recalculara, una factura que el cron subió a mitad del acto cambiaría el
 * resultado sin que nadie lo note.
 */
export function useIniciarSorteo(sorteoId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.rpc('sorteo_iniciar', { p_sorteo_id: sorteoId as number })
      if (error) throw error
    },
    onSuccess: () => {
      if (sorteoId === undefined) return
      void queryClient.invalidateQueries({ queryKey: clavesEjecucion.estado(sorteoId) })
    },
  })
}

/**
 * Las dos cosas que un sorteo SORTEADO todavía admite cambiar.
 *
 * Un sorteo sorteado es un hecho consumado, pero CÓMO se publica ese hecho no:
 * `resultado_publicado` baja o sube la página, y `enmascarar_ganadores` decide si
 * ahí figura «JORGE O.» o el nombre completo. Ninguna de las dos toca quién ganó,
 * y el trigger de la base hace exactamente esa distinción — cualquier otra
 * columna que se cuele en este update vuelve rechazada.
 */
function useAjustePublicacion(columna: 'resultado_publicado' | 'enmascarar_ganadores') {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({ id, valor }: { id: number; valor: boolean }): Promise<void> => {
      // Objeto literal y no `{ [columna]: valor }`: la clave computada se infiere
      // como `string` y el cliente tipado de Supabase rechaza el update.
      const cambios =
        columna === 'resultado_publicado'
          ? { resultado_publicado: valor }
          : { enmascarar_ganadores: valor }

      const { error } = await supabase
        .from('sorteo')
        .update(cambios)
        // `String(id)`: `database.ts` declara `sorteo.id` como `string` aunque la
        // columna sea `bigint`. Convive con eso todo el feature.
        .eq('id', String(id))
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['sorteos'] })
      void queryClient.invalidateQueries({ queryKey: clavesEjecucion.estado(v.id) })
    },
  })
}

/** Publica o despublica la página de constancia. */
export function usePublicarResultado() {
  return useAjustePublicacion('resultado_publicado')
}

/**
 * Enmascara o no los nombres de los ganadores.
 *
 * Vale para cualquier estado, no sólo para SORTEADO: la pantalla de presentación
 * se graba, así que esto hay que poder decidirlo ANTES de sortear.
 */
export function useEnmascararGanadores() {
  return useAjustePublicacion('enmascarar_ganadores')
}
