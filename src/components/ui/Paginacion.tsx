import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentType } from 'react'

import { TAMANIOS_PAGINA } from '@/components/ui/paginacionOpciones'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

/**
 * Pie de paginación de una tabla.
 *
 * Vivía en `features/facturas/components/` y se mudó acá al aparecer la segunda
 * tabla paginada del proyecto. Es puramente presentacional —no sabe qué está
 * paginando— así que lo único que hubo que parametrizar es cómo se llaman las
 * filas, para que la etiqueta del selector no diga "facturas" en el padrón.
 */

interface PaginacionProps {
  pagina: number
  tamanio: number
  total: number
  onPagina: (pagina: number) => void
  onTamanio: (tamanio: number) => void
  /**
   * Cómo se llaman las filas, en plural y minúscula: "facturas", "personas".
   * Sólo se usa para el nombre accesible del selector, que si no queda mudo.
   */
  filas?: string
  tamanios?: readonly number[]
}

export function Paginacion({
  pagina,
  tamanio,
  total,
  onPagina,
  onTamanio,
  filas = 'filas',
  tamanios = TAMANIOS_PAGINA,
}: PaginacionProps) {
  const totalPaginas = Math.max(Math.ceil(total / tamanio), 1)
  const paginaActual = Math.min(pagina, totalPaginas)
  const primeraFila = total === 0 ? 0 : (paginaActual - 1) * tamanio + 1
  const ultimaFila = Math.min(paginaActual * tamanio, total)

  const enPrimera = paginaActual <= 1
  const enUltima = paginaActual >= totalPaginas

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">
          Mostrando{' '}
          <span className="font-medium text-slate-700 tabular-nums">
            {formatNumber(primeraFila)}–{formatNumber(ultimaFila)}
          </span>{' '}
          de <span className="font-medium text-slate-700 tabular-nums">{formatNumber(total)}</span>
        </p>
        <Select
          aria-label={`${filas.charAt(0).toUpperCase()}${filas.slice(1)} por página`}
          value={String(tamanio)}
          onChange={(event) => onTamanio(Number(event.target.value))}
          options={tamanios.map((valor) => ({
            value: String(valor),
            label: `${valor} por página`,
          }))}
          className="py-1.5 text-xs"
        />
      </div>

      <div className="flex items-center gap-1">
        <BotonPagina
          label="Primera página"
          onClick={() => onPagina(1)}
          disabled={enPrimera}
          icon={ChevronFirst}
        />
        <BotonPagina
          label="Página anterior"
          onClick={() => onPagina(paginaActual - 1)}
          disabled={enPrimera}
          icon={ChevronLeft}
        />
        <span className="px-2 text-xs text-slate-500 tabular-nums">
          {formatNumber(paginaActual)} / {formatNumber(totalPaginas)}
        </span>
        <BotonPagina
          label="Página siguiente"
          onClick={() => onPagina(paginaActual + 1)}
          disabled={enUltima}
          icon={ChevronRight}
        />
        <BotonPagina
          label="Última página"
          onClick={() => onPagina(totalPaginas)}
          disabled={enUltima}
          icon={ChevronLast}
        />
      </div>
    </div>
  )
}

function BotonPagina({
  label,
  onClick,
  disabled,
  icon: Icono,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-10 place-items-center rounded-lg text-slate-500 transition-colors sm:size-8',
        'hover:bg-slate-100 hover:text-slate-900',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <Icono className="size-4" />
    </button>
  )
}
