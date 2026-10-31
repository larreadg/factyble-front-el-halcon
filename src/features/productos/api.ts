import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { MONEDA } from '@/features/dashboard/api'
import type { DateRange } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { ProductoEncontrado, VentaProducto } from '@/types/database'

/**
 * Tope de artículos elegidos a la vez. Las claves viajan en la URL y en el
 * cuerpo de la RPC; treinta alcanza para cualquier comparación que se lea en una
 * pantalla y deja la URL en un largo razonable.
 */
export const MAX_PRODUCTOS = 30

/** Debajo de esto el término matchea media ferretería y no ayuda a elegir. */
export const MIN_BUSQUEDA = 2

const claves = {
  busqueda: (termino: string) => ['productos', 'buscar', termino] as const,
  ventas: (range: DateRange, productos: string[]) =>
    ['productos', 'ventas', range.desde, range.hasta, productos] as const,
}

/**
 * El buscador del selector. Busca en todo lo facturado alguna vez —no hay
 * maestro de productos en la nube— y no depende del rango: un artículo que no
 * se vendió en el período igual se tiene que poder elegir, para ver que da cero.
 *
 * `keepPreviousData` para que la lista no parpadee vacía entre tecla y tecla.
 */
export function useBuscarProductos(termino: string) {
  const limpio = termino.trim()
  return useQuery({
    queryKey: claves.busqueda(limpio),
    enabled: limpio.length >= MIN_BUSQUEDA,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ProductoEncontrado[]> => {
      const { data, error } = await supabase.rpc('productos_buscar', {
        p_busqueda: limpio,
        p_limite: 20,
      })
      if (error) throw error
      return data
    },
  })
}

/**
 * Lo vendido de cada artículo elegido en el rango. La RPC devuelve una fila por
 * clave pedida, también las que no se vendieron, así que el resultado siempre
 * tiene tantas filas como artículos hay elegidos.
 *
 * Las claves van ordenadas en la queryKey: el orden en que se eligieron no
 * cambia la respuesta, y así quitar uno y volver a ponerlo pega en la cache.
 */
export function useVentasPorProducto(range: DateRange, productos: string[]) {
  const ordenadas = [...productos].sort()
  return useQuery({
    queryKey: claves.ventas(range, ordenadas),
    enabled: ordenadas.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<VentaProducto[]> => {
      const { data, error } = await supabase.rpc('ventas_por_producto', {
        p_desde: range.desde,
        p_hasta: range.hasta,
        p_claves: ordenadas,
        p_moneda: MONEDA,
      })
      if (error) throw error
      return data
    },
  })
}
