import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

/**
 * La cáscara de un listado: el encabezado de la pantalla y la tarjeta que
 * contiene la lista, con sus estados.
 *
 * ── Qué problema resuelve ──────────────────────────────────────────────────
 * Las tres pantallas de listado repetían la misma secuencia —cargando, error,
 * vacío, contenido, pie— y la repetían distinto: dos con guardas independientes
 * y una con un ternario encadenado, dos con el aviso de «actualizando» arriba
 * dentro de la tarjeta y una con el aviso suelto abajo, afuera. Acá el orden se
 * declara una vez y las tres lo heredan.
 *
 * ── Dónde va el aviso de que se está actualizando ──────────────────────────
 * Junto al título, no sobre la lista. La barra de 32px que había reservaba alto
 * en todas las pantallas para algo que casi nunca se ve, y en un celular esos
 * 32px son media fila. Junto al título no ocupa nada propio, y la lista además
 * se atenúa: son dos señales de lo mismo y ninguna mueve el contenido de lugar.
 */

export function EncabezadoPagina({
  titulo,
  detalle,
  refrescando = false,
  accion,
}: {
  titulo: string
  /** La segunda línea: el conteo, el rango de fechas. */
  detalle?: ReactNode
  refrescando?: boolean
  accion?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{titulo}</h2>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
          {detalle}
          {refrescando ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Actualizando…
            </span>
          ) : null}
        </div>
      </div>
      {accion ? <div className="shrink-0">{accion}</div> : null}
    </div>
  )
}

export function PanelListado({
  cargando = false,
  atenuado = false,
  error,
  vacio,
  pie,
  filasEsqueleto = 8,
  children,
}: {
  cargando?: boolean
  /** Mientras se refresca una página que ya está a la vista. */
  atenuado?: boolean
  /** El `<ErrorState>` ya armado, o `null`. Gana sobre todo lo demás. */
  error?: ReactNode
  /** El `<EmptyState>` ya armado, o `null`, cuando no hay filas. */
  vacio?: ReactNode
  /** La paginación, cuando el listado pagina. */
  pie?: ReactNode
  filasEsqueleto?: number
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      {cargando ? (
        <SkeletonRows rows={filasEsqueleto} className="p-4" />
      ) : error ? (
        error
      ) : vacio ? (
        vacio
      ) : (
        <>
          <div className={cn('transition-opacity duration-200', atenuado && 'opacity-60')}>
            {children}
          </div>
          {pie}
        </>
      )}
    </Card>
  )
}
