import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { CondicionBadge, EstadoBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useFacturaDetalle } from '@/features/facturas/api'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/dates'
import { formatCantidad, formatCurrency, pluralize, toNumber } from '@/lib/format'
import type { Factura, FacturaItem } from '@/types/database'

interface DetalleFacturaPanelProps {
  facturaId: string | null
  /** Término activo del buscador: resalta las líneas que lo contienen. */
  termino?: string
  onCerrar: () => void
}

export function DetalleFacturaPanel({ facturaId, termino, onCerrar }: DetalleFacturaPanelProps) {
  const { data, isPending, isError, refetch } = useFacturaDetalle(facturaId)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  const abierto = facturaId !== null

  useEffect(() => {
    if (!abierto) return

    function onTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }

    window.addEventListener('keydown', onTecla)
    cerrarRef.current?.focus()
    return () => window.removeEventListener('keydown', onTecla)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de la factura"
    >
      <button
        type="button"
        onClick={onCerrar}
        className="animate-velo-entra absolute inset-0 bg-ink-950/50 backdrop-blur-[1px]"
        aria-label="Cerrar detalle"
      />

      <div className="animate-panel-entra absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl shadow-ink-950/30">
        <Encabezado factura={data?.factura} onCerrar={onCerrar} cerrarRef={cerrarRef} />

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {isPending ? <SkeletonRows rows={10} className="p-5" /> : null}

          {!isPending && isError ? (
            <ErrorState
              description="No pudimos traer el detalle de esta factura."
              onRetry={() => void refetch()}
            />
          ) : null}

          {!isPending && !isError && data ? (
            <>
              <Datos factura={data.factura} />
              <Items items={data.items} termino={termino} />
              <Totales factura={data.factura} />
            </>
          ) : null}
        </div>

        {data?.factura.link_qr ? (
          <div className="border-t border-slate-200 px-5 py-3">
            <a
              href={data.factura.link_qr}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              <ExternalLink className="size-4" aria-hidden />
              Ver el KuDE en ekuatia
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Encabezado({
  factura,
  onCerrar,
  cerrarRef,
}: {
  factura?: Factura
  onCerrar: () => void
  cerrarRef: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Factura electrónica</p>
        <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900 tabular-nums">
          {factura?.numero_documento ?? '—'}
        </h2>
        {factura ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EstadoBadge estado={factura.estado_sifen} />
            <CondicionBadge condicion={factura.condicion_venta} />
          </div>
        ) : null}
      </div>

      <button
        ref={cerrarRef}
        type="button"
        onClick={onCerrar}
        className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        aria-label="Cerrar detalle"
      >
        <X className="size-4.5" aria-hidden />
      </button>
    </div>
  )
}

function Datos({ factura }: { factura: Factura }) {
  const establecimiento = [factura.establecimiento_nombre, factura.caja_nombre]
    .filter(Boolean)
    .join(' · ')

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 px-5 py-5 sm:grid-cols-2">
      <Dato etiqueta="Emitida">{formatDateTime(factura.fecha_emision)}</Dato>
      <Dato etiqueta="Moneda">{factura.moneda}</Dato>
      <Dato etiqueta="Receptor" ancho>
        {factura.receptor ?? 'Sin nombre'}
      </Dato>
      <Dato etiqueta="RUC">{factura.receptor_ruc ?? '—'}</Dato>
      <Dato etiqueta="Situación tributaria">{factura.receptor_situacion_tributaria ?? '—'}</Dato>
      {establecimiento ? (
        <Dato etiqueta="Establecimiento / caja" ancho>
          {establecimiento}
        </Dato>
      ) : null}
      {factura.empresa_timbrado ? (
        <Dato etiqueta="Timbrado">{factura.empresa_timbrado}</Dato>
      ) : null}
      {factura.emitida_por ? <Dato etiqueta="Emitida por">{factura.emitida_por}</Dato> : null}
      {factura.cdc ? (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-slate-500">CDC</dt>
          <dd className="mt-1">
            <CopiarCdc cdc={factura.cdc} />
          </dd>
        </div>
      ) : null}
    </dl>
  )
}

function Dato({
  etiqueta,
  ancho = false,
  children,
}: {
  etiqueta: string
  ancho?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('min-w-0', ancho && 'sm:col-span-2')}>
      <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm break-words text-slate-900">{children}</dd>
    </div>
  )
}

function CopiarCdc({ cdc }: { cdc: string }) {
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!copiado) return
    const temporizador = window.setTimeout(() => setCopiado(false), 2000)
    return () => window.clearTimeout(temporizador)
  }, [copiado])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cdc)
      setCopiado(true)
    } catch {
      // Sin permiso de portapapeles (o contexto inseguro): el CDC sigue visible
      // y seleccionable, así que no hay nada que avisar.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className="group flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
    >
      <span className="min-w-0 flex-1 font-mono text-xs break-all text-slate-700">{cdc}</span>
      {copiado ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
          <Check className="size-3.5" aria-hidden />
          Copiado
        </span>
      ) : (
        <Copy
          className="size-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600"
          aria-hidden
        />
      )}
      <span className="sr-only">{copiado ? 'CDC copiado' : 'Copiar el CDC'}</span>
    </button>
  )
}

function Items({ items, termino }: { items: FacturaItem[]; termino?: string }) {
  if (items.length === 0) {
    return (
      <div className="border-t border-slate-200 pt-2">
        <EmptyState
          title="Sin ítems cargados"
          description="Esta factura no tiene líneas de detalle sincronizadas."
        />
      </div>
    )
  }

  return (
    <section className="border-t border-slate-200">
      <h3 className="px-5 pt-5 pb-3 text-sm font-semibold text-slate-900">
        {items.length} {pluralize(items.length, 'ítem', 'ítems')}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-2 text-left font-medium">
                Descripción
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Cant.
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                P. unitario
              </th>
              <th scope="col" className="px-5 py-2 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const coincide =
                esCoincidencia(item.descripcion, termino) || esCoincidencia(item.marca, termino)
              return (
                <tr key={item.id} className={cn(coincide && 'bg-amber-50/70')}>
                  <td className="px-5 py-2.5 text-slate-800">
                    {resaltar(item.descripcion ?? 'Sin descripción', termino)}
                    {/* La marca CONGELADA al vender, no la vigente del catálogo
                        (`marca_nombre`): esta fila es el documento que se le
                        entregó al cliente y tiene que decir lo que decía el KuDE.
                        Es null en ~20% de los ítems — producto sin marca
                        declarada —, y entonces no se dibuja nada. */}
                    {item.marca ? (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {resaltar(item.marca, termino)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-600 tabular-nums">
                    {formatCantidad(item.cantidad)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-600 tabular-nums">
                    {formatCurrency(item.precio_unitario)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Totales({ factura }: { factura: Factura }) {
  // Una factura usa una o dos tasas, no las cinco: las líneas en cero se omiten
  // para que se lea de un vistazo cuál aplicó. `Total IVA` y `Total` van siempre.
  const desglose: { etiqueta: string; valor: number }[] = [
    { etiqueta: 'Exentas', valor: toNumber(factura.total_exentas) },
    { etiqueta: 'Gravadas 5%', valor: toNumber(factura.total_gravado_5) },
    { etiqueta: 'Gravadas 10%', valor: toNumber(factura.total_gravado_10) },
    { etiqueta: 'IVA 5%', valor: toNumber(factura.total_iva_5) },
    { etiqueta: 'IVA 10%', valor: toNumber(factura.total_iva_10) },
  ].filter((linea) => linea.valor !== 0)

  const lineas = [...desglose, { etiqueta: 'Total IVA', valor: toNumber(factura.total_iva) }]

  return (
    <section className="border-t border-slate-200 px-5 py-5">
      <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
        {lineas.map((linea) => (
          <div key={linea.etiqueta} className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-500">{linea.etiqueta}</dt>
            <dd className="text-slate-700 tabular-nums">{formatCurrency(linea.valor)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2.5">
          <dt className="font-medium text-slate-900">Total</dt>
          <dd className="text-base font-semibold text-slate-900 tabular-nums">
            {formatCurrency(factura.total)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function esCoincidencia(descripcion: string | null, termino?: string): boolean {
  if (!descripcion || !termino) return false
  return descripcion.toLocaleLowerCase().includes(termino.toLocaleLowerCase())
}

/** Marca dentro de la descripción los tramos que coinciden con el término buscado. */
function resaltar(texto: string, termino?: string): ReactNode {
  if (!termino) return texto

  const objetivo = texto.toLocaleLowerCase()
  const aguja = termino.toLocaleLowerCase()
  if (!objetivo.includes(aguja)) return texto

  const partes: ReactNode[] = []
  let desde = 0
  let encontrado = objetivo.indexOf(aguja)

  while (encontrado !== -1) {
    if (encontrado > desde) partes.push(texto.slice(desde, encontrado))
    partes.push(
      <mark key={encontrado} className="rounded-sm bg-amber-200/70 px-0.5 text-slate-900">
        {texto.slice(encontrado, encontrado + aguja.length)}
      </mark>,
    )
    desde = encontrado + aguja.length
    encontrado = objetivo.indexOf(aguja, desde)
  }

  if (desde < texto.length) partes.push(texto.slice(desde))
  return partes
}
