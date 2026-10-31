import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type {
  AmbitoBusquedaSorteo,
  FiltroEstadoSorteo,
  SorteosFiltros,
} from '@/features/sorteos/api'
import { ESTADOS } from '@/features/sorteos/estados'

const AMBITOS: AmbitoBusquedaSorteo[] = ['nombre', 'marca']

/**
 * Los filtros del listado viven en la URL, igual que en el listado de facturas: la
 * vista se puede recargar, compartir o volver con el botón atrás sin perder desde
 * dónde se estaba mirando.
 */
export function useSorteosParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filtros = useMemo<SorteosFiltros>(() => {
    const estadoParam = searchParams.get('estado')
    const estado: FiltroEstadoSorteo =
      estadoParam && (ESTADOS as string[]).includes(estadoParam)
        ? (estadoParam as FiltroEstadoSorteo)
        : 'todos'

    const ambitoParam = searchParams.get('en')
    const ambito: AmbitoBusquedaSorteo =
      ambitoParam && (AMBITOS as string[]).includes(ambitoParam)
        ? (ambitoParam as AmbitoBusquedaSorteo)
        : 'nombre'

    return { estado, ambito, busqueda: searchParams.get('q') ?? '' }
  }, [searchParams])

  const setFiltros = useCallback(
    (cambios: Partial<SorteosFiltros>) => {
      setSearchParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales)

          const escribir = (clave: string, valor: string, porDefecto: string) => {
            if (valor === porDefecto) siguientes.delete(clave)
            else siguientes.set(clave, valor)
          }

          if (cambios.estado !== undefined) escribir('estado', cambios.estado, 'todos')
          if (cambios.ambito !== undefined) escribir('en', cambios.ambito, 'nombre')
          if (cambios.busqueda !== undefined) escribir('q', cambios.busqueda.trim(), '')

          return siguientes
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { filtros, setFiltros }
}
