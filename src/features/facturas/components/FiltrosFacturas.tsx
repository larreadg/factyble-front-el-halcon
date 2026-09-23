import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { Select } from '@/components/ui/Select'
import type {
  AmbitoBusqueda,
  FacturasFiltros,
  FiltroCondicion,
  FiltroEstado,
} from '@/features/facturas/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { DateRange } from '@/lib/dates'

interface FiltrosFacturasProps {
  filtros: FacturasFiltros
  onChange: (
    cambios: Partial<
      Pick<FacturasFiltros, 'range' | 'estado' | 'condicion' | 'busqueda' | 'ambito'>
    >,
  ) => void
}

const OPCIONES_ESTADO: { value: FiltroEstado; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'APROBADO', label: 'Aprobadas' },
  { value: 'CANCELADO', label: 'Canceladas' },
]

const OPCIONES_CONDICION: { value: FiltroCondicion; label: string }[] = [
  { value: 'todas', label: 'Todas las condiciones' },
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
]

const OPCIONES_AMBITO: { value: AmbitoBusqueda; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'documento', label: 'Documento' },
  { value: 'item', label: 'Ítems' },
  { value: 'marca', label: 'Marca' },
]

/** El placeholder enseña qué se busca en cada ámbito. */
const PLACEHOLDER: Record<AmbitoBusqueda, string> = {
  todo: 'Buscar por N° doc, RUC, receptor, CDC, ítem o marca',
  documento: 'Buscar por N° doc, RUC, receptor o CDC',
  item: 'Buscar por descripción del ítem',
  marca: 'Buscar por marca del producto',
}

export function FiltrosFacturas({ filtros, onChange }: FiltrosFacturasProps) {
  const [texto, setTexto] = useState(filtros.busqueda)
  const textoDiferido = useDebouncedValue(texto, 400)
  const ultimoEmitido = useRef(filtros.busqueda)

  // El término sale hacia la URL sólo cuando el debounce se asienta.
  useEffect(() => {
    if (textoDiferido === ultimoEmitido.current) return
    ultimoEmitido.current = textoDiferido
    onChange({ busqueda: textoDiferido })
  }, [textoDiferido, onChange])

  // Si la URL cambia por fuera (navegación, back), reflejamos el valor en el campo.
  useEffect(() => {
    if (filtros.busqueda === ultimoEmitido.current) return
    ultimoEmitido.current = filtros.busqueda
    setTexto(filtros.busqueda)
  }, [filtros.busqueda])

  return (
    <div className="space-y-3">
      <DateRangePicker value={filtros.range} onChange={(range: DateRange) => onChange({ range })} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_12rem]">
        {/* El ámbito va dentro del campo: elegir dónde buscar es parte de buscar. */}
        <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200 ring-inset focus-within:ring-2 focus-within:ring-accent-600 sm:col-span-2 lg:col-span-1">
          <div className="relative shrink-0">
            <select
              value={filtros.ambito}
              onChange={(event) => onChange({ ambito: event.target.value as AmbitoBusqueda })}
              aria-label="Buscar en"
              className="h-9 cursor-pointer appearance-none rounded-l-lg bg-transparent py-2 pr-7 pl-3 text-sm font-medium text-slate-700 focus:outline-none"
            >
              {OPCIONES_AMBITO.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
          </div>

          <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />

          <Search className="mx-2 size-4 shrink-0 text-slate-400" aria-hidden />

          <input
            type="search"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder={PLACEHOLDER[filtros.ambito]}
            aria-label="Buscar facturas"
            className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          {texto ? (
            <button
              type="button"
              onClick={() => setTexto('')}
              className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <Select
          aria-label="Filtrar por estado"
          value={filtros.estado}
          onChange={(event) => onChange({ estado: event.target.value as FiltroEstado })}
          options={OPCIONES_ESTADO}
        />

        <Select
          aria-label="Filtrar por condición de venta"
          value={filtros.condicion}
          onChange={(event) => onChange({ condicion: event.target.value as FiltroCondicion })}
          options={OPCIONES_CONDICION}
        />
      </div>
    </div>
  )
}
