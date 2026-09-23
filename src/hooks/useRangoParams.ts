import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { isIsoDate, resolvePreset, type DateRange } from '@/lib/dates'

/**
 * El rango vive en la URL (`?desde=&hasta=`) para que la vista se pueda compartir
 * o recargar. Si falta o es inválido, cae al preset "Este mes".
 */
export function useRangoParams(): { range: DateRange; setRange: (range: DateRange) => void } {
  const [searchParams, setSearchParams] = useSearchParams()

  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const range = useMemo<DateRange>(() => {
    if (isIsoDate(desde) && isIsoDate(hasta) && desde <= hasta) return { desde, hasta }
    return resolvePreset('esteMes')
  }, [desde, hasta])

  const setRange = useCallback(
    (nuevo: DateRange) => {
      setSearchParams(
        (previo) => {
          const params = new URLSearchParams(previo)
          params.set('desde', nuevo.desde)
          params.set('hasta', nuevo.hasta)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { range, setRange }
}
