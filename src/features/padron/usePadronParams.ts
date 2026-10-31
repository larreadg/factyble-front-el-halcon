import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { TAMANIOS_PAGINA } from '@/components/ui/paginacionOpciones'
import type { FiltroVerificado, PadronFiltros } from '@/features/padron/api'
import type { PadronSortField } from '@/types/database'

/**
 * Los filtros del padrón viven en la URL, igual que los de facturas.
 *
 * No es sólo por poder compartir el enlace: es lo que hace que volver atrás
 * desde una ficha devuelva la misma página, con el mismo orden y el mismo
 * término buscado. Con estado local, el botón "atrás" del navegador sale de la
 * pantalla en vez de cerrar el panel.
 */

const TAMANIO_DEFAULT = 25

const ORDENES: PadronSortField[] = ['creado_en', 'nombre', 'documento', 'ciudad_nombre']
const VERIFICADOS: FiltroVerificado[] = ['todos', 'verificados', 'sinVerificar']

function parsearEntero(valor: string | null, minimo: number, fallback: number): number {
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero < minimo) return fallback
  return numero
}

export function usePadronParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filtros = useMemo<PadronFiltros>(() => {
    const verificadosParam = searchParams.get('verificados')
    const verificados: FiltroVerificado =
      verificadosParam && (VERIFICADOS as string[]).includes(verificadosParam)
        ? (verificadosParam as FiltroVerificado)
        : 'todos'

    const ordenParam = searchParams.get('orden')
    const orden: PadronSortField =
      ordenParam && (ORDENES as string[]).includes(ordenParam)
        ? (ordenParam as PadronSortField)
        : 'creado_en'

    const tamanioParam = parsearEntero(searchParams.get('tamanio'), 1, TAMANIO_DEFAULT)
    const tamanio = (TAMANIOS_PAGINA as readonly number[]).includes(tamanioParam)
      ? tamanioParam
      : TAMANIO_DEFAULT

    return {
      busqueda: searchParams.get('q') ?? '',
      verificados,
      orden,
      // Los más nuevos primero, salvo que se pida lo contrario.
      direccion: searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
      pagina: parsearEntero(searchParams.get('pagina'), 1, 1),
      tamanio,
    }
  }, [searchParams])

  const actualizar = useCallback(
    (cambios: Record<string, string | null>, opciones?: { resetearPagina?: boolean }) => {
      setSearchParams(
        (previo) => {
          const params = new URLSearchParams(previo)
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === null || valor === '') params.delete(clave)
            else params.set(clave, valor)
          }
          if (opciones?.resetearPagina) params.delete('pagina')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  /** Cualquier cambio de filtro vuelve a la página 1. */
  const setFiltros = useCallback(
    (cambios: Partial<Pick<PadronFiltros, 'busqueda' | 'verificados' | 'tamanio'>>) => {
      const params: Record<string, string | null> = {}
      if (cambios.busqueda !== undefined) {
        params.q = cambios.busqueda.trim() === '' ? null : cambios.busqueda
      }
      if (cambios.verificados !== undefined) {
        params.verificados = cambios.verificados === 'todos' ? null : cambios.verificados
      }
      if (cambios.tamanio !== undefined) {
        params.tamanio = cambios.tamanio === TAMANIO_DEFAULT ? null : String(cambios.tamanio)
      }
      actualizar(params, { resetearPagina: true })
    },
    [actualizar],
  )

  const setPagina = useCallback(
    (pagina: number) => {
      actualizar({ pagina: pagina <= 1 ? null : String(pagina) })
    },
    [actualizar],
  )

  /** Clic en un encabezado: alterna la dirección o cambia de columna. */
  const setOrden = useCallback(
    (campo: PadronSortField) => {
      const mismaColumna = filtros.orden === campo
      const nuevaDireccion = mismaColumna && filtros.direccion === 'desc' ? 'asc' : 'desc'
      actualizar(
        {
          orden: campo === 'creado_en' ? null : campo,
          dir: nuevaDireccion === 'desc' ? null : nuevaDireccion,
        },
        { resetearPagina: true },
      )
    },
    [actualizar, filtros.direccion, filtros.orden],
  )

  /**
   * La ficha abierta, en la URL.
   *
   * `nuevo` es el valor reservado para el alta: así "agregar" también es un
   * estado navegable, y recargar la página con el panel abierto no lo cierra.
   */
  const fichaAbierta = searchParams.get('ficha')

  const setFichaAbierta = useCallback(
    (valor: string | null) => {
      actualizar({ ficha: valor })
    },
    [actualizar],
  )

  return { filtros, setFiltros, setPagina, setOrden, fichaAbierta, setFichaAbierta }
}
