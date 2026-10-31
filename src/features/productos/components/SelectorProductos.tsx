import { Check, Loader2, Search, X } from 'lucide-react'
import { useState } from 'react'

import { MAX_PRODUCTOS, MIN_BUSQUEDA, useBuscarProductos } from '@/features/productos/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { formatNumber, pluralize, toNumber } from '@/lib/format'
import type { ProductoEncontrado } from '@/types/database'

/**
 * Elegir los artículos a sumar.
 *
 * Misma forma que el selector de marcas de los sorteos —buscador con la lista a
 * la vista y lo elegido arriba en chips— por los mismos motivos: un menú
 * flotante se recorta contra el contenedor, y lo elegido tiene que poder
 * quitarse de un click. La diferencia es que acá no hay catálogo para bajar
 * entero (son miles de artículos), así que la lista la arma la base a medida que
 * se escribe.
 */
export function SelectorProductos({
  elegidos,
  nombres,
  onAgregar,
  onQuitar,
  onLimpiar,
}: {
  elegidos: string[]
  /** Descripción por clave, para los chips. Lo que falte se muestra con la clave. */
  nombres: Record<string, string>
  onAgregar: (producto: ProductoEncontrado) => void
  onQuitar: (clave: string) => void
  onLimpiar: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const termino = useDebouncedValue(busqueda, 300)
  const buscando = termino.trim().length >= MIN_BUSQUEDA
  const { data, isFetching, isError } = useBuscarProductos(termino)

  const elegidosSet = new Set(elegidos)
  const lleno = elegidos.length >= MAX_PRODUCTOS
  const resultados = buscando ? (data ?? []) : []

  function alternar(producto: ProductoEncontrado) {
    if (elegidosSet.has(producto.clave)) onQuitar(producto.clave)
    else onAgregar(producto)
  }

  return (
    <div className="space-y-3">
      {elegidos.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="tabular-nums">
              {formatNumber(elegidos.length)} {pluralize(elegidos.length, 'elegido', 'elegidos')}
              {lleno ? ` (máximo ${MAX_PRODUCTOS})` : ''}
            </span>
            <button
              type="button"
              onClick={onLimpiar}
              className="rounded font-medium text-accent-700 transition-colors hover:text-accent-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Quitar todos
            </button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {elegidos.map((clave) => {
              const nombre = nombres[clave] ?? clave
              return (
                <li key={clave} className="max-w-full">
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-2.5 text-xs font-medium text-brand-900 ring-1 ring-brand-600/20 ring-inset">
                    <span className="truncate" title={nombre}>
                      {nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuitar(clave)}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-600/15 hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-600"
                      aria-label={`Quitar ${nombre}`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg ring-1 ring-slate-200 ring-inset">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por descripción o código"
            aria-label="Buscar producto"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
          {buscando && isFetching ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-slate-400" aria-hidden />
          ) : null}
        </div>

        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {!buscando ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              Escribí parte de la descripción —por ejemplo «tornillo 6x»— o el código exacto del
              producto.
            </p>
          ) : isError ? (
            <p className="px-3 py-4 text-xs text-red-600">
              No pudimos buscar productos. Probá de nuevo en un momento.
            </p>
          ) : data === undefined ? (
            <p className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Buscando…
            </p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              Ningún producto facturado coincide con «{termino.trim()}».
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {resultados.map((producto) => {
                const elegido = elegidosSet.has(producto.clave)
                const documentos = toNumber(producto.documentos)
                return (
                  <li key={producto.clave}>
                    <button
                      type="button"
                      onClick={() => alternar(producto)}
                      disabled={!elegido && lleno}
                      aria-pressed={elegido}
                      className={cn(
                        'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors',
                        'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600',
                        elegido && 'bg-brand-50/60',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded transition-colors',
                          elegido ? 'bg-accent-600 text-white' : 'ring-1 ring-slate-300 ring-inset',
                        )}
                        aria-hidden
                      >
                        {elegido ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-800">
                          {producto.descripcion ?? producto.clave}
                        </span>
                        <span className="block text-xs text-slate-500 tabular-nums">
                          {producto.producto_id ? (
                            <span className="font-mono">{producto.producto_id} · </span>
                          ) : null}
                          {formatNumber(documentos)} {pluralize(documentos, 'factura', 'facturas')}
                          {producto.ultima_venta
                            ? ` · última ${formatDate(producto.ultima_venta)}`
                            : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
