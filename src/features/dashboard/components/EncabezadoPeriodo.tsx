import { DateRangePicker } from '@/components/ui/DateRangePicker'
import type { DateRange } from '@/lib/dates'
import { formatRango } from '@/lib/dates'

interface EncabezadoPeriodoProps {
  range: DateRange
  onChange: (range: DateRange) => void
  detalle: string
}

export function EncabezadoPeriodo({ range, onChange, detalle }: EncabezadoPeriodoProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          Resumen de facturación
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
          {formatRango(range)}
          <span className="text-slate-400"> · {detalle}</span>
        </p>
      </div>
      <DateRangePicker value={range} onChange={onChange} className="lg:items-end" />
    </div>
  )
}
