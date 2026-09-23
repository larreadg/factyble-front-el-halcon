import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type {
  AmbitoBusqueda,
  FacturasFiltros,
  FiltroCondicion,
  FiltroEstado,
} from '@/features/facturas/api'
import { isIsoDate, resolvePreset, type DateRange } from '@/lib/dates'
import type { FacturaSortField } from '@/types/database'

export const TAMANIOS_PAGINA = [10, 25, 50] as const
const TAMANIO_DEFAULT = 25

const ORDENES: FacturaSortField[] = ['fecha_emision', 'numero_documento', 'total']
const ESTADOS: FiltroEstado[] = ['todos', 'APROBADO', 'CANCELADO']
const CONDICIONES: FiltroCondicion[] = ['todas', 'CONTADO', 'CREDITO']
const AMBITOS: AmbitoBusqueda[] = ['todo', 'documento', 'item', 'marca']

/** Parámetros que, al cambiar, obligan a volver a la primera página. */
type CambioFiltros = Partial<
  Pick<FacturasFiltros, 'range' | 'estado' | 'condicion' | 'busqueda' | 'ambito' | 'tamanio'>
>

function parsearEntero(valor: string | null, minimo: number, fallback: number): number {
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero < minimo) return fallback
  return numero
}

export function useFacturasParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filtros = useMemo<FacturasFiltros>(() => {
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const range: DateRange =
      isIsoDate(desde) && isIsoDate(hasta) && desde <= hasta
        ? { desde, hasta }
        : resolvePreset('esteMes')

    const estadoParam = searchParams.get('estado')
    const estado: FiltroEstado =
      estadoParam && (ESTADOS as string[]).includes(estadoParam)
        ? (estadoParam as FiltroEstado)
        : 'todos'

    const condicionParam = searchParams.get('condicion')
    const condicion: FiltroCondicion =
      condicionParam && (CONDICIONES as string[]).includes(condicionParam)
        ? (condicionParam as FiltroCondicion)
        : 'todas'

    const ambitoParam = searchParams.get('en')
    const ambito: AmbitoBusqueda =
      ambitoParam && (AMBITOS as string[]).includes(ambitoParam)
        ? (ambitoParam as AmbitoBusqueda)
        : 'todo'

    const ordenParam = searchParams.get('orden')
    const orden: FacturaSortField =
      ordenParam && (ORDENES as string[]).includes(ordenParam)
        ? (ordenParam as FacturaSortField)
        : 'fecha_emision'

    const direccion = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

    const tamanioParam = parsearEntero(searchParams.get('tamanio'), 1, TAMANIO_DEFAULT)
    const tamanio = (TAMANIOS_PAGINA as readonly number[]).includes(tamanioParam)
      ? tamanioParam
      : TAMANIO_DEFAULT

    return {
      range,
      estado,
      condicion,
      busqueda: searchParams.get('q') ?? '',
      ambito,
      orden,
      direccion,
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
    (cambios: CambioFiltros) => {
      const params: Record<string, string | null> = {}
      if (cambios.range) {
        params.desde = cambios.range.desde
        params.hasta = cambios.range.hasta
      }
      if (cambios.estado !== undefined) {
        params.estado = cambios.estado === 'todos' ? null : cambios.estado
      }
      if (cambios.condicion !== undefined) {
        params.condicion = cambios.condicion === 'todas' ? null : cambios.condicion
      }
      if (cambios.busqueda !== undefined) {
        params.q = cambios.busqueda.trim() === '' ? null : cambios.busqueda
      }
      if (cambios.ambito !== undefined) {
        params.en = cambios.ambito === 'todo' ? null : cambios.ambito
      }
      if (cambios.tamanio !== undefined) {
        params.tamanio = cambios.tamanio === TAMANIO_DEFAULT ? null : String(cambios.tamanio)
      }
      actualizar(params, { resetearPagina: true })
    },
    [actualizar],
  )

  /** La factura abierta en el panel de detalle, para que el enlace se pueda compartir. */
  const facturaAbierta = searchParams.get('factura')

  const setFacturaAbierta = useCallback(
    (facturaId: string | null) => {
      actualizar({ factura: facturaId })
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
    (campo: FacturaSortField) => {
      const mismaColumna = filtros.orden === campo
      const nuevaDireccion = mismaColumna && filtros.direccion === 'desc' ? 'asc' : 'desc'
      actualizar(
        {
          orden: campo === 'fecha_emision' ? null : campo,
          dir: nuevaDireccion === 'desc' ? null : nuevaDireccion,
        },
        { resetearPagina: true },
      )
    },
    [actualizar, filtros.direccion, filtros.orden],
  )

  return { filtros, setFiltros, setPagina, setOrden, facturaAbierta, setFacturaAbierta }
}
