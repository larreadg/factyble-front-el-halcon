import { ExternalLink } from 'lucide-react'

import { CondicionBadge, EstadoBadge } from '@/components/ui/Badge'
import {
  BotonFila,
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
  ThOrden,
} from '@/components/ui/Tabla'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/dates'
import { formatCurrency, toNumber } from '@/lib/format'
import type { Factura, FacturaSortField } from '@/types/database'

interface TablaFacturasProps {
  filas: Factura[]
  orden: FacturaSortField
  direccion: 'asc' | 'desc'
  onOrdenar: (campo: FacturaSortField) => void
  onVerDetalle: (facturaId: string) => void
}

export function TablaFacturas({
  filas,
  orden,
  direccion,
  onOrdenar,
  onVerDetalle,
}: TablaFacturasProps) {
  const totalPagina = filas.reduce((acumulado, fila) => acumulado + toNumber(fila.total), 0)
  const ivaPagina = filas.reduce((acumulado, fila) => acumulado + toNumber(fila.total_iva), 0)

  return (
    <>
      <ListaMovil>
        {filas.map((factura) => (
          <ItemMovil
            key={factura.id}
            titulo={<span className="tabular-nums">{factura.numero_documento ?? '—'}</span>}
            subtitulo={
              <>
                {/* Dos renglones, no `truncate`: cortar «HORACIO SEBASTIAN
                    CORTAZAR» en «HORACIO SEBASTIAN CORTA…» se come el apellido,
                    que es por lo que se busca a un cliente. */}
                <span className="line-clamp-2 text-slate-700">
                  {factura.receptor ?? 'Sin nombre'}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {factura.receptor_ruc ?? 'Sin RUC'}
                </span>
              </>
            }
            derecha={
              <>
                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(factura.total)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  IVA {formatCurrency(factura.total_iva)}
                </p>
              </>
            }
            meta={
              <>
                <EstadoBadge estado={factura.estado_sifen} />
                <CondicionBadge condicion={factura.condicion_venta} />
                <span className="tabular-nums">{formatDateTime(factura.fecha_emision)}</span>
              </>
            }
            accion={
              <>
                <EnlaceKude link={factura.link_qr} />
                <BotonFila
                  onClick={() => onVerDetalle(factura.id)}
                  sobre={
                    factura.numero_documento ? `de la factura ${factura.numero_documento}` : ''
                  }
                >
                  Ver detalle
                </BotonFila>
              </>
            }
          />
        ))}

        {/* El cierre de la lista, con la misma información que el pie de la
            tabla. No es una fila más: es el total de lo que se está mirando. */}
        <li className="flex items-center justify-between bg-slate-50 px-4 py-3 text-xs">
          <span className="text-slate-500">Totales de esta página</span>
          <div className="text-right">
            <p className="font-semibold text-slate-900 tabular-nums">
              {formatCurrency(totalPagina)}
            </p>
            <p className="text-slate-500 tabular-nums">IVA {formatCurrency(ivaPagina)}</p>
          </div>
        </li>
      </ListaMovil>

      <Tabla ancho="ancha">
        <Cabecera>
          <ThOrden campo="fecha_emision" orden={orden} direccion={direccion} onOrdenar={onOrdenar}>
            Fecha emisión
          </ThOrden>
          <ThOrden
            campo="numero_documento"
            orden={orden}
            direccion={direccion}
            onOrdenar={onOrdenar}
          >
            N° documento
          </ThOrden>
          <Th>Receptor</Th>
          <Th>RUC</Th>
          <Th>Condición</Th>
          <ThOrden
            campo="total"
            orden={orden}
            direccion={direccion}
            onOrdenar={onOrdenar}
            align="right"
          >
            Total
          </ThOrden>
          <Th align="right">IVA</Th>
          <Th>Estado</Th>
          <ThAcciones />
        </Cabecera>

        <Cuerpo>
          {filas.map((factura) => (
            <Fila key={factura.id}>
              <Td tono="tenue" numerica>
                {formatDateTime(factura.fecha_emision)}
              </Td>
              <Td tono="principal" numerica>
                {factura.numero_documento ?? '—'}
              </Td>
              <Td className="max-w-56 truncate">
                <span title={factura.receptor ?? undefined}>
                  {factura.receptor ?? 'Sin nombre'}
                </span>
              </Td>
              <Td tono="tenue" numerica>
                {factura.receptor_ruc ?? '—'}
              </Td>
              <Td>
                <CondicionBadge condicion={factura.condicion_venta} />
              </Td>
              <Td tono="principal" align="right" numerica>
                {formatCurrency(factura.total)}
              </Td>
              <Td align="right" numerica>
                {formatCurrency(factura.total_iva)}
              </Td>
              <Td>
                <EstadoBadge estado={factura.estado_sifen} />
              </Td>
              <TdAcciones>
                <EnlaceKude link={factura.link_qr} />
                <BotonFila
                  onClick={() => onVerDetalle(factura.id)}
                  sobre={
                    factura.numero_documento ? `de la factura ${factura.numero_documento}` : ''
                  }
                >
                  Ver detalle
                </BotonFila>
              </TdAcciones>
            </Fila>
          ))}
        </Cuerpo>

        <Pie>
          <td colSpan={5} className="px-4 py-2.5 text-slate-500">
            Totales de esta página
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalPagina)}
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
            {formatCurrency(ivaPagina)}
          </td>
          <td colSpan={2} />
        </Pie>
      </Tabla>
    </>
  )
}

function EnlaceKude({ link }: { link: string | null }) {
  if (!link) return null
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      title="Ver el KuDE en ekuatia"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors',
        'size-10 lg:size-8',
        'hover:bg-slate-100 hover:text-accent-600',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
      )}
    >
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">Ver el KuDE en ekuatia</span>
    </a>
  )
}
