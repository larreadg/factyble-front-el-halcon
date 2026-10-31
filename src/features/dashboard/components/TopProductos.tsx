import type { OrdenTopProductos } from '@/features/dashboard/api'
import { formatCurrency, formatNumber, toNumber } from '@/lib/format'
import type { DashboardProducto } from '@/types/database'

/**
 * El ranking de productos del período, con el criterio que eligió el usuario en
 * el encabezado del bloque (`orden`): por monto facturado o por unidades.
 *
 * Dos cosas siguen al criterio, y las dos por el mismo motivo —que la lista no
 * se lea desordenada—:
 *
 *  - el ANCHO de la barra, que es proporcional a la métrica que ordena. Si
 *    midiera la otra, las filas se verían fuera de orden;
 *  - cuál de los dos números va DESTACADO a la derecha. El que no está ahí baja
 *    a la línea de abajo: los dos se ven siempre, porque el artículo que más
 *    factura y el que más rota rara vez son el mismo y la comparación es justo
 *    lo que se está mirando.
 *
 * La RPC agrupa por código de producto cuando lo hay, así que el mismo artículo
 * facturado con descripciones distintas llega como UNA fila, con la descripción
 * del documento más reciente. Las facturas sin código agrupan por descripción y
 * llegan con `producto_id` en null.
 */
export function TopProductos({
  data,
  orden,
}: {
  data: DashboardProducto[]
  orden: OrdenTopProductos
}) {
  const porCantidad = orden === 'cantidad'
  const metrica = (fila: DashboardProducto) => toNumber(porCantidad ? fila.cantidad : fila.total)
  const maximo = Math.max(...data.map(metrica), 1)

  return (
    <ol className="-mx-2">
      {data.map((fila, indice) => {
        const cantidad = toNumber(fila.cantidad)
        const total = toNumber(fila.total)
        const documentos = toNumber(fila.documentos)
        const valor = porCantidad ? cantidad : total
        const proporcion = Math.max((valor / maximo) * 100, valor > 0 ? 1.5 : 0)
        const unidades = `${formatNumber(cantidad)} ${cantidad === 1 ? 'unidad' : 'unidades'}`
        const facturas = `${formatNumber(documentos)} ${documentos === 1 ? 'factura' : 'facturas'}`

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
                  {porCantidad ? formatCurrency(total) : unidades} · {facturas}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-slate-900 tabular-nums">
                {porCantidad ? unidades : formatCurrency(total)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
