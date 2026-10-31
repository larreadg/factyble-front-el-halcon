import { useQuery } from '@tanstack/react-query'

import type { DateRange, Granularidad } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type {
  DashboardMarca,
  DashboardPeriodo,
  DashboardProducto,
  DashboardReceptor,
  DashboardResumen,
  Factura,
} from '@/types/database'

/** Única moneda del cliente por ahora; las RPC la reciben como parámetro. */
export const MONEDA = 'PYG'

/**
 * Criterio del ranking de productos. Son dos preguntas distintas y no dos vistas
 * del mismo dato: `'total'` contesta qué artículo MUEVE más plata y `'cantidad'`
 * cuál ROTA más. Un artículo caro que sale de a uno encabeza el primero y no
 * figura en el segundo.
 *
 * Los valores son exactamente los que acepta la RPC; si llegara otro, la función
 * cae a `'total'` en vez de fallar, pero el tipo existe para que eso no pase.
 */
export type OrdenTopProductos = 'total' | 'cantidad'

/** El default de la pantalla, y también el de la RPC. */
export const ORDEN_TOP_PRODUCTOS_DEFECTO: OrdenTopProductos = 'total'

/** Etiqueta del selector, y lo que dice el encabezado del bloque, por criterio. */
export const ORDEN_TOP_PRODUCTOS: Record<
  OrdenTopProductos,
  { label: string; descripcion: string }
> = {
  total: { label: 'Por facturación', descripcion: 'Por monto facturado en el período' },
  cantidad: { label: 'Por unidades', descripcion: 'Por unidades facturadas en el período' },
}

/**
 * Las opciones del selector, en el orden en que se ofrecen. Va aparte del
 * `Record` porque un objeto no promete orden de claves y acá el orden es parte
 * de la UI: primero el default.
 */
export const ORDEN_TOP_PRODUCTOS_OPCIONES: { value: OrdenTopProductos; label: string }[] = [
  { value: 'total', label: ORDEN_TOP_PRODUCTOS.total.label },
  { value: 'cantidad', label: ORDEN_TOP_PRODUCTOS.cantidad.label },
]

const claves = {
  resumen: (range: DateRange) => ['dashboard', 'resumen', range.desde, range.hasta] as const,
  periodo: (range: DateRange, granularidad: Granularidad) =>
    ['dashboard', 'periodo', range.desde, range.hasta, granularidad] as const,
  receptores: (range: DateRange, limite: number) =>
    ['dashboard', 'receptores', range.desde, range.hasta, limite] as const,
  productos: (range: DateRange, limite: number, orden: OrdenTopProductos) =>
    ['dashboard', 'productos', range.desde, range.hasta, limite, orden] as const,
  marcas: (range: DateRange, limite: number) =>
    ['dashboard', 'marcas', range.desde, range.hasta, limite] as const,
  ultimas: (limite: number) => ['dashboard', 'ultimas-facturas', limite] as const,
}

/**
 * Resumen del período. El mismo hook sirve para el rango anterior: al compartir
 * queryKey, moverse entre presets reutiliza lo que ya está en cache.
 */
export function useResumen(range: DateRange) {
  return useQuery({
    queryKey: claves.resumen(range),
    queryFn: async (): Promise<DashboardResumen | null> => {
      const { data, error } = await supabase.rpc('dashboard_resumen', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_moneda: MONEDA,
      })
      if (error) throw error
      return data[0] ?? null
    },
  })
}

export function usePorPeriodo(range: DateRange, granularidad: Granularidad) {
  return useQuery({
    queryKey: claves.periodo(range, granularidad),
    queryFn: async (): Promise<DashboardPeriodo[]> => {
      const { data, error } = await supabase.rpc('dashboard_por_periodo', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_granularidad: granularidad,
        p_moneda: MONEDA,
      })
      if (error) throw error
      return data
    },
  })
}

export function useTopReceptores(range: DateRange, limite = 10) {
  return useQuery({
    queryKey: claves.receptores(range, limite),
    queryFn: async (): Promise<DashboardReceptor[]> => {
      const { data, error } = await supabase.rpc('dashboard_top_receptores', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_limite: limite,
        p_moneda: MONEDA,
      })
      if (error) throw error
      return data
    },
  })
}

/**
 * Top de productos del período. Depende de la RPC `dashboard_top_productos`, que
 * vive —como todo el esquema de la base— en `supabase/schema.sql` del backend.
 *
 * Agrupa por código de producto cuando lo hay, así que el mismo artículo con dos
 * descripciones distintas llega como una sola fila.
 *
 * `orden` va en la queryKey, no se ordena en el cliente: el ranking son las diez
 * primeras filas de la base, y las diez por monto no son un reordenamiento de las
 * diez por unidades — son otras filas. Ordenar acá mostraría el top de unidades
 * acomodado por plata, que es una lista sin sentido.
 */
export function useTopProductos(
  range: DateRange,
  limite = 10,
  orden: OrdenTopProductos = ORDEN_TOP_PRODUCTOS_DEFECTO,
) {
  return useQuery({
    queryKey: claves.productos(range, limite, orden),
    queryFn: async (): Promise<DashboardProducto[]> => {
      const { data, error } = await supabase.rpc('dashboard_top_productos', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_limite: limite,
        p_moneda: MONEDA,
        p_orden: orden,
      })
      if (error) throw error
      return data
    },
  })
}

/**
 * Top de marcas del período, por MONTO facturado — el mismo criterio con el que
 * arranca `useTopProductos`, que además se puede cambiar a unidades. Acá el
 * criterio es fijo: una marca se juzga por la plata que mueve, y el selector
 * existe en productos porque ahí la rotación sí es una pregunta corriente.
 *
 * La RPC agrupa por el CÓDIGO de marca y no por el texto congelado en cada ítem:
 * una marca renombrada en el maestro de PVTA aparecería partida en dos. Deja
 * fuera los ítems sin marca y el centinela `99999` ("Sin Marca"), que como fila
 * encabezaría el ranking sin decir nada — por eso lo que suma este bloque no da
 * el total facturado del período, y el encabezado lo aclara.
 */
export function useTopMarcas(range: DateRange, limite = 10) {
  return useQuery({
    queryKey: claves.marcas(range, limite),
    queryFn: async (): Promise<DashboardMarca[]> => {
      const { data, error } = await supabase.rpc('dashboard_top_marcas', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_limite: limite,
        p_moneda: MONEDA,
      })
      if (error) throw error
      return data
    },
  })
}

/** Columnas que necesita la mini tabla de últimas facturas. */
export type UltimaFactura = Pick<
  Factura,
  | 'id'
  | 'fecha_emision'
  | 'numero_documento'
  | 'receptor'
  | 'receptor_ruc'
  | 'total'
  | 'estado_sifen'
  | 'link_qr'
>

/**
 * Las últimas facturas no dependen del rango elegido: son siempre las más
 * recientes cargadas en el espejo.
 */
export function useUltimasFacturas(limite = 5) {
  return useQuery({
    queryKey: claves.ultimas(limite),
    queryFn: async (): Promise<UltimaFactura[]> => {
      const { data, error } = await supabase
        .from('v_factura')
        .select(
          'id, fecha_emision, numero_documento, receptor, receptor_ruc, total, estado_sifen, link_qr',
        )
        .order('fecha_emision', { ascending: false })
        .limit(limite)
        .returns<UltimaFactura[]>()
      if (error) throw error
      return data
    },
  })
}
