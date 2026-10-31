import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type {
  Ciudad,
  ClienteSorteoCambio,
  ClienteSorteoCambios,
  ClienteSorteoListado,
  ClienteSorteoNuevo,
  PadronSortField,
} from '@/types/database'

/**
 * El padrón de participantes de sorteos.
 *
 * ── Esta es la segunda pantalla del proyecto que escribe, y la primera que
 *    toca datos personales de terceros ──────────────────────────────────────
 * `cliente_sorteo` no tenía un solo GRANT para `authenticated` hasta que existió
 * esta pantalla, y el schema explicaba por qué. La premisa cambió: los datos hay
 * que poder corregirlos y borrarlos —el consentimiento que la gente acepta
 * promete "puedo pedir que los borren cuando quiera"— y hacerlo desde el panel
 * de Supabase no es una respuesta. Ver la sección EL PANEL de
 * `factyble-back/supabase/schema_clientes.sql`.
 *
 * ── Lo que NO se puede escribir desde acá, y no es un olvido ───────────────
 *   · `cliente_sorteo_historial` es de sólo lectura: lo escribe un trigger, y
 *     poder editarlo sería poder tapar lo que se editó.
 *   · `es_empresa` lo deriva un trigger del documento. Mandarlo sería mentirle
 *     a la base sobre algo que ella calcula mejor.
 *   · `ruc` es una columna generada.
 *   · `consentimiento_en` y `politica_version` son el registro de qué aceptó
 *     esa persona y cuándo. Editarlos sería falsificar un consentimiento.
 */

export const claves = {
  listado: (filtros: PadronFiltros) =>
    [
      'padron',
      'listado',
      filtros.busqueda,
      filtros.verificados,
      filtros.orden,
      filtros.direccion,
      filtros.pagina,
      filtros.tamanio,
    ] as const,
  historial: (id: number) => ['padron', 'historial', id] as const,
  ciudades: () => ['padron', 'ciudades'] as const,
}

/** Sólo `verificados` filtra de verdad; el resto describe cómo se muestra. */
export type FiltroVerificado = 'todos' | 'verificados' | 'sinVerificar'

export interface PadronFiltros {
  busqueda: string
  verificados: FiltroVerificado
  orden: PadronSortField
  direccion: 'asc' | 'desc'
  pagina: number
  tamanio: number
}

export interface PadronPagina {
  filas: ClienteSorteoListado[]
  total: number
}

/**
 * Normaliza el término libre antes de mandarlo a PostgREST.
 *
 * `%` y `_` son comodines de `ilike`: si no se neutralizan, alguien que escribe
 * un guion bajo dispara una búsqueda que no pidió. Mismo criterio que en
 * facturas.
 */
export function sanitizarBusqueda(termino: string): string {
  return termino.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchPadron(filtros: PadronFiltros): Promise<PadronPagina> {
  const desdeFila = (filtros.pagina - 1) * filtros.tamanio
  const hastaFila = desdeFila + filtros.tamanio - 1

  let query = supabase.from('v_cliente_sorteo').select('*', { count: 'exact' })

  const termino = sanitizarBusqueda(filtros.busqueda)
  if (termino) {
    // Un solo `ilike` contra la columna `busqueda` de la vista, que ya concatena
    // nombre, documento, RUC, teléfono y ciudad. Sin ella esto sería un `.or()`
    // de cinco campos, con el escapado que eso arrastra.
    query = query.ilike('busqueda', `%${termino}%`)
  }

  if (filtros.verificados === 'verificados') {
    query = query.eq('telefono_verificado', true)
  } else if (filtros.verificados === 'sinVerificar') {
    query = query.eq('telefono_verificado', false)
  }

  const { data, error, count } = await query
    .order(filtros.orden, { ascending: filtros.direccion === 'asc', nullsFirst: false })
    // Desempate estable: sin esto, dos filas con la misma fecha pueden saltar de
    // página al pasar de la 1 a la 2.
    .order('id', { ascending: true })
    .range(desdeFila, hastaFila)
    .returns<ClienteSorteoListado[]>()

  if (error) throw error
  return { filas: data, total: count ?? 0 }
}

export function usePadron(filtros: PadronFiltros) {
  return useQuery({
    queryKey: claves.listado(filtros),
    queryFn: () => fetchPadron(filtros),
    placeholderData: keepPreviousData,
  })
}

/**
 * El catálogo de ciudades para el desplegable.
 *
 * Se consulta a la base en vez de usar `features/publico/ciudades.ts`, que trae
 * las mismas 249 filas en el bundle. Acá hay sesión y un GRANT de sólo lectura,
 * así que la fuente puede ser la de verdad; aquel archivo existe porque el
 * formulario público no tiene ninguna de las dos cosas.
 */
export function useCiudades() {
  return useQuery({
    queryKey: claves.ciudades(),
    queryFn: async (): Promise<Ciudad[]> => {
      const { data, error } = await supabase
        .from('ciudad')
        .select('id, departamento, nombre')
        .order('departamento', { ascending: true })
        .order('nombre', { ascending: true })
        .returns<Ciudad[]>()
      if (error) throw error
      return data
    },
    // Un catálogo de distritos cambia una vez por año.
    staleTime: 60 * 60 * 1000,
  })
}

/** Qué se le sobrescribió a esta persona, y cuándo. Se pide al abrir su ficha. */
export function useHistorial(clienteId: number | null) {
  return useQuery({
    queryKey: claves.historial(clienteId ?? 0),
    queryFn: async (): Promise<ClienteSorteoCambio[]> => {
      const { data, error } = await supabase
        .from('cliente_sorteo_historial')
        .select('id, cliente_id, nombre, telefono, ciudad_id, documento_dv, reemplazado_en')
        .eq('cliente_id', clienteId as number)
        .order('reemplazado_en', { ascending: false })
        .returns<ClienteSorteoCambio[]>()
      if (error) throw error
      return data
    },
    enabled: clienteId !== null,
  })
}

/* ────────────────────────────── Escrituras ────────────────────────────── */

/**
 * Invalida el listado después de cada escritura.
 *
 * Siempre el listado entero y no la fila: la clave incluye los filtros y la
 * página, así que no hay una sola entrada que corregir — y una fila editada
 * puede además dejar de coincidir con el filtro activo.
 */
function useInvalidar() {
  const queryClient = useQueryClient()
  return {
    listado: () => void queryClient.invalidateQueries({ queryKey: ['padron', 'listado'] }),
    historial: (id: number) =>
      void queryClient.invalidateQueries({ queryKey: claves.historial(id) }),
  }
}

export function useCrearCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (datos: ClienteSorteoNuevo): Promise<void> => {
      const { error } = await supabase.from('cliente_sorteo').insert(datos)
      if (error) throw error
    },
    onSuccess: () => {
      invalidar.listado()
    },
  })
}

export function useActualizarCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: number
      cambios: ClienteSorteoCambios
    }): Promise<void> => {
      const { error } = await supabase.from('cliente_sorteo').update(cambios).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_datos, variables) => {
      invalidar.listado()
      // El trigger acaba de escribir una fila de historial con lo que había
      // antes: sin esto, la ficha abierta seguiría mostrando la lista vieja.
      invalidar.historial(variables.id)
    },
  })
}

export function useEliminarCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      // El historial se va con la fila por la FK en cascada. Es lo correcto
      // cuando el borrado responde a un "sacame de la lista": dejar el rastro de
      // los cambios de alguien que pidió ser borrado no sería cumplir el pedido.
      const { error } = await supabase.from('cliente_sorteo').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidar.listado()
    },
  })
}
