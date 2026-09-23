import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { CondicionBadge, EstadoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
  atenuada: boolean
}

export function TablaFacturas({
  filas,
  orden,
  direccion,
  onOrdenar,
  onVerDetalle,
  atenuada,
}: TablaFacturasProps) {
  const totalPagina = filas.reduce((acumulado, fila) => acumulado + toNumber(fila.total), 0)
  const ivaPagina = filas.reduce((acumulado, fila) => acumulado + toNumber(fila.total_iva), 0)

  return (
    <div className={cn('transition-opacity', atenuada && 'opacity-60')}>
      {/* Escritorio */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <Encabezado
                campo="fecha_emision"
                orden={orden}
                direccion={direccion}
                onOrdenar={onOrdenar}
              >
                Fecha emisión
              </Encabezado>
              <Encabezado
                campo="numero_documento"
                orden={orden}
                direccion={direccion}
                onOrdenar={onOrdenar}
              >
                N° documento
              </Encabezado>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Receptor
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                RUC
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Condición
              </th>
              <Encabezado
                campo="total"
                orden={orden}
                direccion={direccion}
                onOrdenar={onOrdenar}
                alineacion="right"
              >
                Total
              </Encabezado>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                IVA
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Estado
              </th>
              <th scope="col" className="w-40 px-4 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((factura) => (
              <tr key={factura.id} className="transition-colors hover:bg-slate-50/70">
                <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                  {formatDateTime(factura.fecha_emision)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 tabular-nums">
                  {factura.numero_documento ?? '—'}
                </td>
                <td className="max-w-56 truncate px-4 py-3 text-slate-800">
                  <span title={factura.receptor ?? undefined}>
                    {factura.receptor ?? 'Sin nombre'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500 tabular-nums">
                  {factura.receptor_ruc ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <CondicionBadge condicion={factura.condicion_venta} />
                </td>
                <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">
                  {formatCurrency(factura.total)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600 tabular-nums">
                  {formatCurrency(factura.total_iva)}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={factura.estado_sifen} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <BotonDetalle
                      numero={factura.numero_documento}
                      onClick={() => onVerDetalle(factura.id)}
                    />
                    <EnlaceKude link={factura.link_qr} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 text-xs">
            <tr>
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
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-slate-100 lg:hidden">
        {filas.map((factura) => (
          <li key={factura.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 tabular-nums">
                  {factura.numero_documento ?? '—'}
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-700">
                  {factura.receptor ?? 'Sin nombre'}
                </p>
                <p className="text-xs text-slate-400 tabular-nums">
                  {factura.receptor_ruc ?? 'Sin RUC'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(factura.total)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  IVA {formatCurrency(factura.total_iva)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <EstadoBadge estado={factura.estado_sifen} />
              <CondicionBadge condicion={factura.condicion_venta} />
              <span className="text-xs text-slate-400 tabular-nums">
                {formatDateTime(factura.fecha_emision)}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <BotonDetalle
                  numero={factura.numero_documento}
                  onClick={() => onVerDetalle(factura.id)}
                />
                <EnlaceKude link={factura.link_qr} />
              </div>
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between bg-slate-50 px-4 py-3 text-xs">
          <span className="text-slate-500">Totales de esta página</span>
          <div className="text-right">
            <p className="font-semibold text-slate-900 tabular-nums">
              {formatCurrency(totalPagina)}
            </p>
            <p className="text-slate-500 tabular-nums">IVA {formatCurrency(ivaPagina)}</p>
          </div>
        </li>
      </ul>
    </div>
  )
}

interface EncabezadoProps {
  campo: FacturaSortField
  orden: FacturaSortField
  direccion: 'asc' | 'desc'
  onOrdenar: (campo: FacturaSortField) => void
  alineacion?: 'left' | 'right'
  children: ReactNode
}

function Encabezado({
  campo,
  orden,
  direccion,
  onOrdenar,
  alineacion = 'left',
  children,
}: EncabezadoProps) {
  const activo = orden === campo
  const Icono = !activo ? ArrowUpDown : direccion === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      scope="col"
      className="px-4 py-2.5 font-medium"
      aria-sort={activo ? (direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
          activo && 'text-slate-900',
          alineacion === 'right' && 'w-full justify-end',
        )}
      >
        {children}
        <Icono
          className={cn('size-3.5', activo ? 'text-accent-600' : 'text-slate-400')}
          aria-hidden
        />
      </button>
    </th>
  )
}

function BotonDetalle({ numero, onClick }: { numero: string | null; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      Ver detalle
      <span className="sr-only">{numero ? ` de la factura ${numero}` : ''}</span>
    </Button>
  )
}

function EnlaceKude({ link, className }: { link: string | null; className?: string }) {
  if (!link) return null
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      title="Ver el KuDE en ekuatia"
      className={cn(
        'inline-flex shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-accent-600',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
        className,
      )}
    >
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">Ver el KuDE en ekuatia</span>
    </a>
  )
}
