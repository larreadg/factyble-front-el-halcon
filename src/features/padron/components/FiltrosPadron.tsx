import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { FiltroVerificado, PadronFiltros } from '@/features/padron/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface FiltrosPadronProps {
  filtros: PadronFiltros
  onChange: (cambios: Partial<Pick<PadronFiltros, 'busqueda' | 'verificados'>>) => void
}

const OPCIONES_VERIFICADO: { value: FiltroVerificado; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'verificados', label: 'Celular verificado' },
  { value: 'sinVerificar', label: 'Sin verificar' },
]

export function FiltrosPadron({ filtros, onChange }: FiltrosPadronProps) {
  // El campo escribe en un estado local y el filtro va con retardo: sin esto,
  // cada tecla dispara una consulta paginada contra la base.
  //
  // El ref es el mismo patrón que `FiltrosFacturas`, y no es adorno: el valor
  // viaja en las DOS direcciones —del campo a la URL con retardo, y de la URL al
  // campo cuando alguien vuelve atrás—, así que sin una marca de "esto ya lo
  // emití" los dos efectos se disparan mutuamente.
  const [texto, setTexto] = useState(filtros.busqueda)
  const textoDiferido = useDebouncedValue(texto, 300)
  const ultimoEmitido = useRef(filtros.busqueda)

  // Hacia la URL, cuando el debounce se asienta.
  useEffect(() => {
    if (textoDiferido === ultimoEmitido.current) return
    ultimoEmitido.current = textoDiferido
    onChange({ busqueda: textoDiferido })
  }, [textoDiferido, onChange])

  // Desde la URL, cuando cambia por fuera: el botón "atrás", un enlace compartido.
  useEffect(() => {
    if (filtros.busqueda === ultimoEmitido.current) return
    ultimoEmitido.current = filtros.busqueda
    setTexto(filtros.busqueda)
  }, [filtros.busqueda])

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar por nombre, documento, celular o ciudad"
            aria-label="Buscar en el padrón"
            className="pr-9 pl-9"
          />
          {texto ? (
            <button
              type="button"
              onClick={() => setTexto('')}
              aria-label="Limpiar la búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <Select
          aria-label="Filtrar por estado del celular"
          value={filtros.verificados}
          onChange={(evento) =>
            onChange({ verificados: evento.target.value as FiltroVerificado })
          }
          options={OPCIONES_VERIFICADO}
          contenedorClassName="sm:w-52"
        />
      </div>
    </Card>
  )
}
