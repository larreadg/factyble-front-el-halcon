import { X } from 'lucide-react'

import {
  Cabecera,
  Cuerpo,
  Fila,
  ItemMovil,
  ListaMovil,
  Pie,
  Tabla,
  Td,
  TdAcciones,
  Th,
  ThAcciones,
} from '@/components/ui/Tabla'
import { formatDate } from '@/lib/dates'
import { formatCantidad, formatCurrency, formatNumber, pluralize, toNumber } from '@/lib/format'
import type { VentaProducto } from '@/types/database'

/**
 * Lo vendido de cada artículo elegido, con el total de la selección.
 *
 * ── Qué se suma y qué no ───────────────────────────────────────────────────
 * El monto y las unidades se suman entre filas. Las FACTURAS no: una factura que
 * lleva dos de los artículos elegidos cuenta en las dos filas, y su suma daría
 * más documentos de los que hay. Por eso el pie no tiene total de facturas.
 *
 * ── Las filas en cero se quedan ────────────────────────────────────────────
 * Un artículo sin ventas en el rango es una respuesta, no un hueco: la fila se
 * muestra atenuada y dice cuándo fue la última venta, que suele ser lo próximo
 * que se pregunta.
 */
export function TablaVentasProductos({
  data,
  onQuitar,
}: {
  data: VentaProducto[]
  onQuitar: (clave: string) => void
}) {
  const totalGeneral = data.reduce((suma, fila) => suma + toNumber(fila.total), 0)
  const unidadesGenerales = data.reduce((suma, fila) => suma + toNumber(fila.cantidad), 0)

  const filas = data.map((fila) => {
    const total = toNumber(fila.total)
    const cantidad = toNumber(fila.cantidad)
    const documentos = toNumber(fila.documentos)
    return {
      fila,
      total,
      cantidad,
      documentos,
      vendido: cantidad !== 0 || total !== 0,
      promedio: cantidad !== 0 ? total / cantidad : null,
      participacion: totalGeneral > 0 ? (total / totalGeneral) * 100 : 0,
    }
  })

  return (
    <>
      <ListaMovil>
        {filas.map(({ fila, total, cantidad, documentos, vendido, promedio }) => (
          <ItemMovil
            key={fila.clave}
            titulo={
              <span className={vendido ? undefined : 'text-slate-500'}>{fila.descripcion}</span>
            }
            subtitulo={
              fila.producto_id ? (
                <span className="font-mono text-xs text-slate-400">{fila.producto_id}</span>
              ) : null
            }
            derecha={
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatCurrency(total)}
              </span>
            }
            meta={
              vendido ? (
                <span className="tabular-nums">
                  {formatCantidad(cantidad)} {pluralize(cantidad, 'unidad', 'unidades')} ·{' '}
                  {formatNumber(documentos)} {pluralize(documentos, 'factura', 'facturas')}
                  {promedio !== null ? ` · prom. ${formatCurrency(promedio)}` : ''}
                </span>
              ) : (
                <SinVentas ultimaVenta={fila.ultima_venta} />
              )
            }
            accion={<BotonQuitar onClick={() => onQuitar(fila.clave)} nombre={fila.descripcion} />}
          />
        ))}
        <li className="flex items-baseline justify-between gap-3 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500 tabular-nums">
            Total · {formatCantidad(unidadesGenerales)}{' '}
            {pluralize(unidadesGenerales, 'unidad', 'unidades')}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalGeneral)}
          </span>
        </li>
      </ListaMovil>

      <Tabla>
        <Cabecera>
          <Th>Producto</Th>
          <Th align="right">Unidades</Th>
          <Th align="right">Facturas</Th>
          <Th align="right">Precio prom.</Th>
          <Th align="right">Total</Th>
          <Th className="w-40">Participación</Th>
          <ThAcciones />
        </Cabecera>
        <Cuerpo>
          {filas.map(({ fila, total, cantidad, documentos, vendido, promedio, participacion }) => (
            <Fila key={fila.clave}>
              <Td tono={vendido ? 'principal' : 'tenue'}>
                <span className="block">{fila.descripcion}</span>
                <span className="block text-xs font-normal text-slate-400">
                  {fila.producto_id ? (
                    <span className="font-mono">{fila.producto_id}</span>
                  ) : (
                    'Sin código'
                  )}
                  {vendido ? null : (
                    <>
                      {' · '}
                      <SinVentas ultimaVenta={fila.ultima_venta} />
                    </>
                  )}
                </span>
              </Td>
              <Td align="right" numerica>
                {formatCantidad(cantidad)}
              </Td>
              <Td align="right" numerica tono="tenue">
                {formatNumber(documentos)}
              </Td>
              <Td align="right" numerica tono="tenue">
                {promedio !== null ? formatCurrency(promedio) : '—'}
              </Td>
              <Td align="right" numerica tono="principal">
                {formatCurrency(total)}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent-500"
                      style={{ width: `${participacion}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                    {formatNumber(participacion)}%
                  </span>
                </div>
              </Td>
              <TdAcciones>
                <BotonQuitar onClick={() => onQuitar(fila.clave)} nombre={fila.descripcion} />
              </TdAcciones>
            </Fila>
          ))}
        </Cuerpo>
        <Pie>
          <td className="px-4 py-2.5 text-slate-500">
            Total de {formatNumber(data.length)} {pluralize(data.length, 'producto', 'productos')}
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
            {formatCantidad(unidadesGenerales)}
          </td>
          <td colSpan={2} />
          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalGeneral)}
          </td>
          <td colSpan={2} />
        </Pie>
      </Tabla>
    </>
  )
}

function SinVentas({ ultimaVenta }: { ultimaVenta: string | null }) {
  return (
    <span>
      Sin ventas en el período
      {ultimaVenta ? ` · última ${formatDate(ultimaVenta)}` : ' · nunca facturado'}
    </span>
  )
}

function BotonQuitar({ onClick, nombre }: { onClick: () => void; nombre: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 lg:size-8"
      aria-label={`Quitar ${nombre}`}
    >
      <X className="size-4" aria-hidden />
    </button>
  )
}
