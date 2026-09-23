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

const claves = {
  resumen: (range: DateRange) => ['dashboard', 'resumen', range.desde, range.hasta] as const,
  periodo: (range: DateRange, granularidad: Granularidad) =>
    ['dashboard', 'periodo', range.desde, range.hasta, granularidad] as const,
  receptores: (range: DateRange, limite: number) =>
    ['dashboard', 'receptores', range.desde, range.hasta, limite] as const,
  productos: (range: DateRange, limite: number) =>
    ['dashboard', 'productos', range.desde, range.hasta, limite] as const,
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
 */
export function useTopProductos(range: DateRange, limite = 10) {
  return useQuery({
    queryKey: claves.productos(range, limite),
    queryFn: async (): Promise<DashboardProducto[]> => {
      const { data, error } = await supabase.rpc('dashboard_top_productos', {
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
 * Top de marcas del período, por MONTO facturado — criterio distinto al de
 * `useTopProductos`, que va por unidades. No es un descuido: un artículo se juzga
 * por rotación y una marca por la plata que mueve. Cada bloque lo dice en su
 * encabezado para que la diferencia no se lea como inconsistencia.
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
