import { ExternalLink } from 'lucide-react'

import { EstadoBadge } from '@/components/ui/Badge'
import type { UltimaFactura } from '@/features/dashboard/api'
import { formatDate } from '@/lib/dates'
import { formatCurrency } from '@/lib/format'

/**
 * Una fila por factura en todos los anchos, y no una tabla en escritorio como
 * antes: este bloque vive en media columna del grid desde que el dashboard tiene
 * cuatro rankings, y la tabla de seis columnas (fecha, documento, receptor,
 * total, estado, enlace) necesita ~640px para no romperse. Media fila da 488px
 * en `xl` y 616px en `2xl`: sólo llegaría a entrar en pantallas de 1920, y para
 * todo el resto habría que apretar el receptor hasta dejarlo ilegible.
 *
 * La lista dice lo mismo en dos renglones y entra en cualquier ancho. Lo único
 * que la tabla mostraba aparte era el RUC, que acá va en la línea secundaria.
 */
export function UltimasFacturas({ data }: { data: UltimaFactura[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {data.map((factura) => (
        <li key={factura.id} className="flex items-start gap-3 py-2.5 first:pt-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-800" title={factura.receptor ?? undefined}>
              {factura.receptor ?? 'Sin nombre'}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
              {factura.numero_documento ?? '—'} · {formatDate(factura.fecha_emision)} ·{' '}
              {factura.receptor_ruc ?? 'Sin RUC'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-slate-900 tabular-nums">
              {formatCurrency(factura.total)}
            </p>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <EstadoBadge estado={factura.estado_sifen} />
              <EnlaceKude link={factura.link_qr} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EnlaceKude({ link }: { link: string | null }) {
  if (!link) return null
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer noopener"
      title="Ver en SIFEN"
      className="inline-flex rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-accent-700"
    >
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">Ver factura en SIFEN</span>
    </a>
  )
}
