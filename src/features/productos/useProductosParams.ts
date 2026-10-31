import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { MAX_PRODUCTOS } from '@/features/productos/api'

/**
 * Los artículos elegidos viven en la URL (`?p=P001&p=P002`), igual que el rango.
 * Así la consulta se puede guardar, compartir o recargar sin volver a elegirlos
 * uno por uno — que es justo lo tedioso de esta pantalla.
 *
 * Un `p` repetido por artículo y no una lista separada por comas: la clave puede
 * ser una descripción (facturas sin código), y una descripción puede tener comas.
 */
const PARAM = 'p'

export function useProductosParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const elegidos = useMemo(
    () =>
      [...new Set(searchParams.getAll(PARAM))]
        .filter((clave) => clave.trim() !== '')
        .slice(0, MAX_PRODUCTOS),
    [searchParams],
  )

  const escribir = useCallback(
    (siguientes: string[]) => {
      setSearchParams(
        (previo) => {
          const params = new URLSearchParams(previo)
          params.delete(PARAM)
          for (const clave of siguientes) params.append(PARAM, clave)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const agregar = useCallback(
    (clave: string) => {
      if (elegidos.includes(clave) || elegidos.length >= MAX_PRODUCTOS) return
      escribir([...elegidos, clave])
    },
    [elegidos, escribir],
  )

  const quitar = useCallback(
    (clave: string) => escribir(elegidos.filter((elegido) => elegido !== clave)),
    [elegidos, escribir],
  )

  const limpiar = useCallback(() => escribir([]), [escribir])

  return { elegidos, agregar, quitar, limpiar }
}
