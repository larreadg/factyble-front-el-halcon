import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import {
  hoyEnAsuncion,
  isIsoDate,
  matchPreset,
  RANGE_PRESETS,
  resolvePreset,
  type DateRange,
  type RangePresetId,
} from '@/lib/dates'

const CAMPO_FECHA = cn(
  'h-10 w-full rounded-lg border-0 bg-white px-2.5 text-xs text-slate-900',
  'ring-1 ring-slate-200 ring-inset focus:ring-2 focus:ring-accent-600 focus:outline-none',
  'sm:h-auto sm:w-auto sm:py-1.5',
)

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const presetActivo = matchPreset(value)
  const [abiertoManualmente, setAbiertoManualmente] = useState(false)

  // Un rango que no coincide con ningún preset (llegó por URL, por ejemplo) abre
  // los campos solo: no hace falta sincronizar estado con un efecto.
  const mostrarCustom = presetActivo === 'custom' || abiertoManualmente

  function seleccionarPreset(preset: RangePresetId) {
    if (preset === 'custom') {
      setAbiertoManualmente(true)
      return
    }
    setAbiertoManualmente(false)
    onChange(resolvePreset(preset))
  }

  function cambiarExtremo(extremo: 'desde' | 'hasta', nuevo: string) {
    if (!isIsoDate(nuevo)) return
    const candidato: DateRange = { ...value, [extremo]: nuevo }
    // Si el usuario cruza los extremos, arrastramos el otro para mantener el rango válido.
    if (candidato.desde > candidato.hasta) {
      if (extremo === 'desde') candidato.hasta = nuevo
      else candidato.desde = nuevo
    }
    onChange(candidato)
  }

  const hoy = hoyEnAsuncion()

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {/* En pantalla chica los presets entran en un control nativo: seis pills
          envueltas ocupan media pantalla y son difíciles de acertar al toque. */}
      <Select
        aria-label="Período"
        contenedorClassName="sm:hidden"
        className="h-10"
        value={presetActivo === 'custom' || abiertoManualmente ? 'custom' : presetActivo}
        onChange={(event) => seleccionarPreset(event.target.value as RangePresetId)}
        options={RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
      />

      <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
        {RANGE_PRESETS.map((preset) => {
          const activo = preset.id === 'custom' ? mostrarCustom : presetActivo === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => seleccionarPreset(preset.id)}
              aria-pressed={activo}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
                activo
                  ? 'bg-accent-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50',
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {mostrarCustom ? (
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <CalendarDays className="hidden size-4 shrink-0 text-slate-400 sm:block" aria-hidden />
          <label className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-1.5">
            Desde
            <input
              type="date"
              value={value.desde}
              max={value.hasta}
              onChange={(event) => cambiarExtremo('desde', event.target.value)}
              className={CAMPO_FECHA}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-1.5">
            Hasta
            <input
              type="date"
              value={value.hasta}
              min={value.desde}
              max={hoy}
              onChange={(event) => cambiarExtremo('hasta', event.target.value)}
              className={CAMPO_FECHA}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
