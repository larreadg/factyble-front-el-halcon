import { formatCurrency, formatNumber, toNumber } from '@/lib/format'
import type { DashboardProducto } from '@/types/database'

/**
 * Ordenado por cantidad vendida, que es lo que responde "más vendidos"; el total
 * facturado va al lado porque el artículo que más sale no es siempre el que más
 * factura. El relleno de la fila es proporcional a la cantidad del primero.
 *
 * La RPC agrupa por código de producto cuando lo hay, así que el mismo artículo
 * facturado con descripciones distintas llega como UNA fila, con la descripción
 * del documento más reciente. Las facturas sin código agrupan por descripción y
 * llegan con `producto_id` en null.
 */
export function TopProductos({ data }: { data: DashboardProducto[] }) {
  const maximo = Math.max(...data.map((fila) => toNumber(fila.cantidad)), 1)

  return (
    <ol className="-mx-2">
      {data.map((fila, indice) => {
        const cantidad = toNumber(fila.cantidad)
        const documentos = toNumber(fila.documentos)
        const proporcion = Math.max((cantidad / maximo) * 100, cantidad > 0 ? 1.5 : 0)

        return (
          <li
            // `producto_id` primero: es la clave real del grupo y no cambia si el
            // artículo se renombra. Cae a la descripción para los grupos que se
            // armaron por ella (facturas sin código de producto).
            key={fila.producto_id ?? `${fila.descripcion ?? 'sin-descripcion'}-${indice}`}
            className="relative isolate rounded-md"
          >
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
                <p
                  className="truncate text-sm text-slate-800"
                  title={fila.descripcion ?? undefined}
                >
                  {fila.descripcion ?? 'Sin descripción'}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {formatNumber(cantidad)} {cantidad === 1 ? 'unidad' : 'unidades'} ·{' '}
                  {formatNumber(documentos)} {documentos === 1 ? 'factura' : 'facturas'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-slate-900 tabular-nums">
                {formatCurrency(fila.total)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
