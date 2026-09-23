import { formatCurrency, formatNumber, toNumber } from '@/lib/format'
import type { DashboardReceptor } from '@/types/database'

/**
 * El relleno de cada fila codifica el peso del cliente sobre el primero, así la
 * comparación se lee de un vistazo sin una columna extra de gráfico.
 */
export function TopClientes({ data }: { data: DashboardReceptor[] }) {
  const maximo = Math.max(...data.map((fila) => toNumber(fila.total)), 1)

  return (
    <ol className="-mx-2">
      {data.map((fila, indice) => {
        const total = toNumber(fila.total)
        const cantidad = toNumber(fila.cantidad)
        const proporcion = Math.max((total / maximo) * 100, total > 0 ? 1.5 : 0)

        return (
          <li
            key={`${fila.receptor_ruc ?? 'sin-ruc'}-${indice}`}
            className="relative isolate rounded-md"
          >
            <div
              className="absolute inset-y-0 left-0 -z-10 rounded-md bg-accent-50"
              style={{ width: `${proporcion}%` }}
              aria-hidden
            />
            <div className="flex items-baseline gap-2.5 px-2 py-2">
              <span className="w-4 shrink-0 text-right text-xs text-slate-400 tabular-nums">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-800" title={fila.receptor ?? undefined}>
                  {fila.receptor ?? 'Sin nombre'}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {fila.receptor_ruc ?? 'Sin RUC'} · {formatNumber(cantidad)}{' '}
                  {cantidad === 1 ? 'factura' : 'facturas'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-slate-900 tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
