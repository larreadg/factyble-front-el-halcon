import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Select } from '@/components/ui/Select'
import type {
  AmbitoBusquedaSorteo,
  FiltroEstadoSorteo,
  SorteosFiltros,
} from '@/features/sorteos/api'
import { ESTADOS, ETIQUETA } from '@/features/sorteos/estados'

const OPCIONES_ESTADO: { value: FiltroEstadoSorteo; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  ...ESTADOS.map((estado) => ({ value: estado, label: ETIQUETA[estado] })),
]

const OPCIONES_AMBITO: { value: AmbitoBusquedaSorteo; label: string }[] = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'marca', label: 'Marca' },
]

const PLACEHOLDER: Record<AmbitoBusquedaSorteo, string> = {
  nombre: 'Buscar por nombre del sorteo',
  marca: 'Buscar por marca que participa',
}

/**
 * Mismo control que el buscador de facturas, con dos ámbitos en vez de cuatro:
 * elegir dónde se busca es parte de buscar, y repetir el patrón evita que el
 * usuario tenga que aprender dos buscadores distintos en la misma app.
 *
 * El ámbito `marca` busca contra `marcas_texto`, que trae el nombre VIGENTE del
 * catálogo: un sorteo de una marca que después se renombró se encuentra igual por
 * el nombre de hoy, aunque la fila guarde el nombre con el que se publicó.
 */
export function FiltrosSorteos({
  filtros,
  onChange,
}: {
  filtros: SorteosFiltros
  onChange: (cambios: Partial<SorteosFiltros>) => void
}) {
  const [texto, setTexto] = useState(filtros.busqueda)
  const ultimoEmitido = useRef(filtros.busqueda)

  // Debounce de 350 ms: el listado no tiene paginación, así que cada tecla sería
  // una consulta a la vista completa.
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      if (texto === ultimoEmitido.current) return
      ultimoEmitido.current = texto
      onChange({ busqueda: texto })
    }, 350)
    return () => window.clearTimeout(temporizador)
  }, [texto, onChange])

  useEffect(() => {
    if (filtros.busqueda === ultimoEmitido.current) return
    ultimoEmitido.current = filtros.busqueda
    setTexto(filtros.busqueda)
  }, [filtros.busqueda])

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200 ring-inset focus-within:ring-2 focus-within:ring-accent-600">
        <div className="relative shrink-0">
          <select
            value={filtros.ambito}
            onChange={(evento) => onChange({ ambito: evento.target.value as AmbitoBusquedaSorteo })}
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
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={PLACEHOLDER[filtros.ambito]}
          aria-label="Buscar sorteos"
          className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
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
        onChange={(evento) => onChange({ estado: evento.target.value as FiltroEstadoSorteo })}
        options={OPCIONES_ESTADO}
      />
    </div>
  )
}
