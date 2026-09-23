import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'

import { useTamanioContenedor } from '@/hooks/useTamanioContenedor'

import { formatPeriodo, formatPeriodoLargo, type Granularidad } from '@/lib/dates'
import { formatCompactCurrency, formatCurrency, formatNumber, toNumber } from '@/lib/format'
import type { DashboardPeriodo } from '@/types/database'

interface FacturacionChartProps {
  data: DashboardPeriodo[]
  granularidad: Granularidad
}

interface PuntoGrafico {
  periodo: string
  etiqueta: string
  total: number
  cantidad: number
}

const ETIQUETA_PROMEDIO: Record<Granularidad, string> = {
  day: 'Promedio diario',
  week: 'Promedio semanal',
  month: 'Promedio mensual',
}

export function FacturacionChart({ data, granularidad }: FacturacionChartProps) {
  const { ref, tamanio } = useTamanioContenedor<HTMLDivElement>()

  const puntos: PuntoGrafico[] = data.map((fila) => ({
    periodo: fila.periodo,
    etiqueta: formatPeriodo(fila.periodo, granularidad),
    total: toNumber(fila.total),
    cantidad: toNumber(fila.cantidad),
  }))

  // El promedio es la referencia que convierte la curva en una lectura: sin él,
  // un pico no dice si el día fue bueno o apenas normal.
  const conFacturacion = puntos.filter((punto) => punto.total > 0)
  const promedio =
    conFacturacion.length > 0
      ? conFacturacion.reduce((suma, punto) => suma + punto.total, 0) / conFacturacion.length
      : 0

  return (
    <div>
      <div ref={ref} className="h-60 w-full sm:h-72">
        {tamanio.ancho > 0 ? (
          <AreaChart
            width={tamanio.ancho}
            height={tamanio.alto}
            data={puntos}
            margin={{ top: 12, right: 12, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="gradienteFacturacion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-600)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--color-accent-600)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--color-slate-200)" strokeDasharray="2 4" vertical={false} />

            <XAxis
              dataKey="etiqueta"
              tick={{ fontSize: 11, fill: 'var(--color-slate-500)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-slate-200)' }}
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis
              width={72}
              tick={{ fontSize: 11, fill: 'var(--color-slate-500)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(valor: number) => formatCompactCurrency(valor)}
            />

            {promedio > 0 ? (
              <ReferenceLine
                y={promedio}
                stroke="var(--color-slate-400)"
                strokeDasharray="4 4"
                label={
                  // Angosto: la línea se explica en el pie del bloque, no encima de la curva.
                  tamanio.ancho >= 520
                    ? {
                        value: `${ETIQUETA_PROMEDIO[granularidad]}: ${formatCompactCurrency(promedio)}`,
                        position: 'insideBottomLeft',
                        fill: 'var(--color-slate-500)',
                        fontSize: 11,
                      }
                    : undefined
                }
              />
            ) : null}

            <Tooltip
              cursor={{ stroke: 'var(--color-slate-300)', strokeWidth: 1 }}
              content={<TooltipFacturacion granularidad={granularidad} promedio={promedio} />}
            />

            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-accent-600)"
              strokeWidth={2}
              fill="url(#gradienteFacturacion)"
              activeDot={{
                r: 4,
                fill: 'var(--color-accent-600)',
                stroke: 'var(--color-white)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        ) : null}
      </div>
      {promedio > 0 && tamanio.ancho > 0 && tamanio.ancho < 520 ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-px w-4 border-t border-dashed border-slate-400" aria-hidden />
          {ETIQUETA_PROMEDIO[granularidad]}: {formatCompactCurrency(promedio)}
        </p>
      ) : null}
    </div>
  )
}

interface TooltipFacturacionProps {
  active?: boolean
  payload?: { payload?: PuntoGrafico }[]
  granularidad: Granularidad
  promedio: number
}

function TooltipFacturacion({ active, payload, granularidad, promedio }: TooltipFacturacionProps) {
  const punto = payload?.[0]?.payload
  if (!active || !punto) return null

  const diferencia = promedio > 0 ? ((punto.total - promedio) / promedio) * 100 : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md shadow-slate-900/10">
      <p className="text-xs font-medium text-slate-900 capitalize">
        {formatPeriodoLargo(punto.periodo, granularidad)}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
        {formatCurrency(punto.total)}
      </p>
      <p className="text-xs text-slate-500 tabular-nums">
        {formatNumber(punto.cantidad)} {punto.cantidad === 1 ? 'factura' : 'facturas'}
      </p>
      {diferencia !== null && punto.total > 0 ? (
        <p className="mt-1 border-t border-slate-100 pt-1 text-xs text-slate-500 tabular-nums">
          {diferencia >= 0 ? 'Por encima' : 'Por debajo'} del promedio
        </p>
      ) : null}
    </div>
  )
}
