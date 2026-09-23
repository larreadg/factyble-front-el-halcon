import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { rangeToTimestamptz, type DateRange } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type {
  CondicionVenta,
  EstadoSifen,
  Factura,
  FacturaItem,
  FacturaSortField,
} from '@/types/database'

export type FiltroEstado = 'todos' | EstadoSifen
export type FiltroCondicion = 'todas' | CondicionVenta
/**
 * Dónde busca el término libre.
 *
 * `item` y `marca` no son lo mismo y la diferencia se nota al usarlos: `item`
 * busca en la descripción de lo vendido (que además arrastra la marca congelada
 * del ítem), mientras que `marca` busca en la marca sola, con el nombre vigente
 * del catálogo. Buscar "TRAMONTINA" en `item` también trae el artículo cuya
 * descripción la nombra; en `marca` trae exactamente las facturas que llevan
 * algo de esa marca, incluso si se renombró después de venderse.
 */
export type AmbitoBusqueda = 'todo' | 'documento' | 'item' | 'marca'

export interface FacturasFiltros {
  range: DateRange
  estado: FiltroEstado
  condicion: FiltroCondicion
  busqueda: string
  ambito: AmbitoBusqueda
  orden: FacturaSortField
  direccion: 'asc' | 'desc'
  pagina: number
  tamanio: number
}

export interface FacturasPagina {
  filas: Factura[]
  total: number
}

/** Columnas que pide la tabla: evitamos traer el resto de la vista. */
const COLUMNAS = [
  'id',
  'cdc',
  'numero_documento',
  'fecha_emision',
  'estado_sifen',
  'condicion_venta',
  'moneda',
  'total',
  'total_iva',
  'receptor_ruc',
  'receptor',
  'establecimiento_nombre',
  'caja_nombre',
  'link_qr',
].join(', ')

/** Campos de cabecera de la factura. */
const CAMPOS_DOCUMENTO = ['numero_documento', 'receptor_ruc', 'receptor', 'cdc'] as const

/**
 * Columnas calculadas de `v_factura_busqueda`: las descripciones de los ítems de
 * la factura concatenadas, y las marcas de esos ítems sin repetir. Sólo se usan
 * para filtrar; el listado nunca las selecciona.
 */
const CAMPO_ITEMS = 'items_texto'
const CAMPO_MARCAS = 'marcas_texto'

function camposDe(ambito: AmbitoBusqueda): readonly string[] {
  switch (ambito) {
    case 'documento':
      return CAMPOS_DOCUMENTO
    case 'item':
      return [CAMPO_ITEMS]
    case 'marca':
      return [CAMPO_MARCAS]
    // "Todo" incluye las marcas aunque `items_texto` ya arrastre la congelada:
    // sin `marcas_texto` el ámbito por defecto se perdería las marcas
    // renombradas, y un "todo" con un agujero es peor que una consulta que
    // evalúa una subconsulta correlacionada más.
    case 'todo':
      return [...CAMPOS_DOCUMENTO, CAMPO_ITEMS, CAMPO_MARCAS]
  }
}

/**
 * Normaliza el término libre antes de mandarlo a PostgREST.
 *
 * `%` y `_` son comodines de `ilike`, así que los neutralizamos para que el
 * usuario no dispare búsquedas raras sin querer.
 */
export function sanitizarBusqueda(termino: string): string {
  return termino.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Arma el filtro `.or(...)`. El valor va entre comillas dobles para que las comas
 * y los paréntesis del término no rompan la sintaxis del parámetro, y dentro de
 * las comillas escapamos `\` y `"`.
 */
function construirFiltroBusqueda(termino: string, ambito: AmbitoBusqueda): string {
  const escapado = termino.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const patron = `"%${escapado}%"`
  return camposDe(ambito)
    .map((campo) => `${campo}.ilike.${patron}`)
    .join(',')
}

export const facturasQueryKey = (filtros: FacturasFiltros) =>
  [
    'facturas',
    filtros.range.desde,
    filtros.range.hasta,
    filtros.estado,
    filtros.condicion,
    filtros.busqueda,
    filtros.ambito,
    filtros.orden,
    filtros.direccion,
    filtros.pagina,
    filtros.tamanio,
  ] as const

async function fetchFacturas(filtros: FacturasFiltros): Promise<FacturasPagina> {
  const limites = rangeToTimestamptz(filtros.range)
  const desdeFila = (filtros.pagina - 1) * filtros.tamanio
  const hastaFila = desdeFila + filtros.tamanio - 1

  let query = supabase
    .from('v_factura_busqueda')
    .select(COLUMNAS, { count: 'exact' })
    .gte('fecha_emision', limites.desde)
    .lte('fecha_emision', limites.hasta)

  if (filtros.estado !== 'todos') {
    query = query.eq('estado_sifen', filtros.estado)
  }
  if (filtros.condicion !== 'todas') {
    query = query.eq('condicion_venta', filtros.condicion)
  }

  const termino = sanitizarBusqueda(filtros.busqueda)
  if (termino) {
    query = query.or(construirFiltroBusqueda(termino, filtros.ambito))
  }

  const { data, error, count } = await query
    .order(filtros.orden, { ascending: filtros.direccion === 'asc', nullsFirst: false })
    // Desempate estable: sin esto, dos filas con la misma fecha pueden saltar de página.
    .order('id', { ascending: true })
    .range(desdeFila, hastaFila)
    .returns<Factura[]>()

  if (error) throw error

  return { filas: data, total: count ?? 0 }
}

export function useFacturas(filtros: FacturasFiltros) {
  return useQuery({
    queryKey: facturasQueryKey(filtros),
    queryFn: () => fetchFacturas(filtros),
    placeholderData: keepPreviousData,
  })
}

export interface FacturaConItems {
  factura: Factura
  items: FacturaItem[]
}

async function fetchFacturaDetalle(facturaId: string): Promise<FacturaConItems> {
  // Las dos consultas son independientes: van juntas para no encadenar latencias.
  const [cabecera, items] = await Promise.all([
    supabase.from('v_factura').select('*').eq('id', facturaId).single<Factura>(),
    supabase
      .from('v_factura_item')
      // Columnas enumeradas y no `*`: el select es el contrato que `FacturaItem`
      // declara, y con `*` los dos se desincronizan sin que nadie se entere.
      .select(
        'id, factura_id, nro_linea, descripcion, cantidad, precio_unitario, tasa, impuesto, total, producto_id, marca_id, marca, marca_nombre',
      )
      .eq('factura_id', facturaId)
      // Por `nro_linea`, que es el orden en que el ítem salió impreso en el KuDE.
      // `id` (el orden de carga del espejo) coincide hoy, pero es un detalle de
      // cómo replica el sync, no el orden del documento.
      .order('nro_linea', { ascending: true })
      .returns<FacturaItem[]>(),
  ])

  if (cabecera.error) throw cabecera.error
  if (items.error) throw items.error

  return { factura: cabecera.data, items: items.data }
}

/** El detalle se pide recién cuando hay una factura seleccionada. */
export function useFacturaDetalle(facturaId: string | null) {
  return useQuery({
    queryKey: ['factura-detalle', facturaId] as const,
    queryFn: () => fetchFacturaDetalle(facturaId as string),
    enabled: facturaId !== null,
    // La factura ya está emitida: una vez traída, no cambia.
    staleTime: 5 * 60 * 1000,
  })
}
