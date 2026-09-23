import { formatCurrency, formatNumber, toNumber } from '@/lib/format'
import type { DashboardMarca } from '@/types/database'

/**
 * Ordenado por monto facturado, que es como la RPC devuelve las filas y como se
 * juzga una marca: lo que importa es la plata que mueve, no cuántas unidades
 * salieron. Por eso el relleno es proporcional al TOTAL —a diferencia de
 * `TopProductos`, donde va por cantidad—: si la barra midiera otra cosa que el
 * orden de la lista, las filas se verían desordenadas.
 *
 * Comparte el tinte `brand` con `TopProductos` a propósito. El color agrupa por
 * pregunta, no por bloque: los dos contestan "qué se vendió" y van pareados en
 * la misma fila, mientras `TopClientes` contesta "a quién" y por eso lleva
 * `accent`.
 */
export function TopMarcas({ data }: { data: DashboardMarca[] }) {
  const maximo = Math.max(...data.map((fila) => toNumber(fila.total)), 1)

  return (
    <ol className="-mx-2">
      {data.map((fila, indice) => {
        const total = toNumber(fila.total)
        const cantidad = toNumber(fila.cantidad)
        const documentos = toNumber(fila.documentos)
        const proporcion = Math.max((total / maximo) * 100, total > 0 ? 1.5 : 0)

        return (
          // `marca_id` es la clave real del grupo y la RPC garantiza que no sea
          // null (la exige en el `where`), así que no hace falta el índice de
          // desempate que sí necesitan los otros dos rankings.
          <li key={fila.marca_id} className="relative isolate rounded-md">
            <div
              className="absolute inset-y-0 left-0 -z-10 rounded-md bg-brand-50"
              style={{ width: `${proporcion}%` }}
              aria-hidden
            />
            <div className="flex items-baseline gap-2.5 px-2 py-2">
              <span className="w-4 shrink-0 text-right text-xs text-slate-400 tabular-nums">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                {/* El nombre VIGENTE del catálogo, no el texto congelado en el
                    ítem: es por el que se agrupa y sobrevive a que la marca se
                    renombre. Puede faltar cuando el código no resuelve contra
                    el catálogo y el ítem tampoco traía texto. */}
                <p className="truncate text-sm text-slate-800" title={fila.marca ?? undefined}>
                  {fila.marca ?? `Marca ${fila.marca_id}`}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {formatNumber(cantidad)} {cantidad === 1 ? 'unidad' : 'unidades'} ·{' '}
                  {formatNumber(documentos)} {documentos === 1 ? 'factura' : 'facturas'}
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
