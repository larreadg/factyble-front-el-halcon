import { Check, Loader2, Search, Tag, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAgregarMarca, useCatalogoMarcas, useQuitarMarca } from '@/features/sorteos/api'
import { mensajeDeError } from '@/features/sorteos/errores'
import { cn } from '@/lib/cn'
import { formatNumber, pluralize } from '@/lib/format'
import type { SorteoMarca, SorteoPremio } from '@/types/database'

/**
 * Elegir las marcas del sorteo, contra el catálogo replicado desde PVTA.
 *
 * ── Por qué una lista con buscador y no un `<select multiple>` ──────────────
 * Son ~500 marcas. Un multi-select nativo obliga a scrollear a ciegas y a
 * mantener Ctrl apretado para no perder lo elegido; y un combo con menú flotante
 * se recorta contra el `overflow` del contenedor de la página. La lista está
 * siempre a la vista, filtra mientras se escribe y lo elegido queda arriba, donde
 * se puede quitar de un click.
 *
 * ── Cada click es un guardado ────────────────────────────────────────────────
 * No hay "guardar marcas": agregar o quitar escribe en el momento. El sorteo ya
 * existe (es un borrador), y un botón de guardar sobre una lista de casillas sólo
 * agregaría un estado intermedio que se puede perder al recargar.
 */
export function SelectorMarcas({
  sorteoId,
  empresaId,
  elegidas,
  premios,
}: {
  sorteoId: string
  empresaId: string
  elegidas: SorteoMarca[]
  premios: SorteoPremio[]
}) {
  const { data: catalogo, isPending, isError, error } = useCatalogoMarcas(empresaId)
  const agregar = useAgregarMarca()
  const quitar = useQuitarMarca()

  const [busqueda, setBusqueda] = useState('')
  const [porQuitar, setPorQuitar] = useState<SorteoMarca | null>(null)

  const codigosElegidos = useMemo(
    () => new Set(elegidas.map((marca) => marca.marca_codigo)),
    [elegidas],
  )

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const todas = catalogo ?? []
    if (!termino) return todas
    return todas.filter(
      (marca) =>
        marca.nombre.toLowerCase().includes(termino) ||
        marca.codigo.toLowerCase().includes(termino),
    )
  }, [catalogo, busqueda])

  /** Premios que se irían con la marca: la FK los borra en cascada. */
  const premiosDe = (codigo: string) => premios.filter((premio) => premio.marca_codigo === codigo)

  const enProceso = agregar.isPending || quitar.isPending
  const errorMutacion = agregar.error ?? quitar.error

  function alternar(codigo: string, nombre: string) {
    const yaEsta = elegidas.find((marca) => marca.marca_codigo === codigo)
    if (!yaEsta) {
      agregar.mutate({
        sorteo_id: sorteoId,
        marca_codigo: codigo,
        empresa_id: empresaId,
        marca_nombre: nombre,
      })
      return
    }
    // Quitar una marca que aporta premios los borra: se avisa antes.
    if (premiosDe(codigo).length > 0) {
      setPorQuitar(yaEsta)
      return
    }
    quitar.mutate({ sorteoId, marcaCodigo: codigo })
  }

  return (
    <div className="space-y-3">
      {elegidas.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {elegidas.map((marca) => (
            <li key={marca.marca_codigo}>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-2.5 text-xs font-medium text-brand-900 ring-1 ring-brand-600/20 ring-inset">
                {marca.marca_nombre}
                <button
                  type="button"
                  onClick={() => alternar(marca.marca_codigo, marca.marca_nombre)}
                  disabled={enProceso}
                  className="flex size-5 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-600/15 hover:text-brand-950 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-600"
                  aria-label={`Quitar ${marca.marca_nombre}`}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">
          Todavía no elegiste ninguna marca. El sorteo no se puede publicar sin al menos una.
        </p>
      )}

      <div className="rounded-lg ring-1 ring-slate-200 ring-inset">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar marca por nombre o código"
            aria-label="Buscar marca en el catálogo"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
          {catalogo ? (
            <span className="shrink-0 text-xs text-slate-400 tabular-nums">
              {formatNumber(filtradas.length)}
            </span>
          ) : null}
        </div>

        <div className="scrollbar-thin max-h-64 overflow-y-auto">
          {isPending ? (
            <p className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Cargando el catálogo de marcas…
            </p>
          ) : isError ? (
            <p className="px-3 py-4 text-xs text-red-600">
              {mensajeDeError(error, 'No pudimos leer el catálogo de marcas.')}
            </p>
          ) : (catalogo ?? []).length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              El catálogo de marcas está vacío. Se llena desde el on-prem con{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                npm run sync:marcas
              </code>
              ; hasta entonces no se puede armar un sorteo por marca.
            </p>
          ) : filtradas.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              Ninguna marca coincide con «{busqueda.trim()}».
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtradas.map((marca) => {
                const elegida = codigosElegidos.has(marca.codigo)
                return (
                  <li key={marca.codigo}>
                    <button
                      type="button"
                      onClick={() => alternar(marca.codigo, marca.nombre)}
                      disabled={enProceso}
                      aria-pressed={elegida}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-slate-50 disabled:opacity-60',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600',
                        elegida && 'bg-brand-50/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded transition-colors',
                          elegida ? 'bg-accent-600 text-white' : 'ring-1 ring-slate-300 ring-inset',
                        )}
                        aria-hidden
                      >
                        {elegida ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-800">{marca.nombre}</span>
                      <span className="shrink-0 font-mono text-[11px] text-slate-400">
                        {marca.codigo}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {errorMutacion ? (
        <p className="text-xs text-red-600">{mensajeDeError(errorMutacion)}</p>
      ) : null}

      <ConfirmDialog
        abierto={porQuitar !== null}
        titulo={`Quitar ${porQuitar?.marca_nombre ?? ''} del sorteo`}
        descripcion="Los premios que aporta esta marca se borran junto con ella."
        detalle={
          porQuitar ? (
            <>
              Se van a borrar{' '}
              <strong className="font-semibold text-slate-700">
                {formatNumber(premiosDe(porQuitar.marca_codigo).length)}{' '}
                {pluralize(premiosDe(porQuitar.marca_codigo).length, 'premio', 'premios')}
              </strong>
              :{' '}
              {premiosDe(porQuitar.marca_codigo)
                .map((premio) => premio.nombre)
                .join(', ')}
              .
              <span className="mt-1 flex items-center gap-1 text-slate-400">
                <Tag className="size-3" aria-hidden />
                Para conservarlos, primero cambiales la marca.
              </span>
            </>
          ) : null
        }
        textoConfirmar="Quitar marca y premios"
        procesando={quitar.isPending}
        onCancelar={() => setPorQuitar(null)}
        onConfirmar={() => {
          if (!porQuitar) return
          quitar.mutate(
            { sorteoId, marcaCodigo: porQuitar.marca_codigo },
            { onSuccess: () => setPorQuitar(null) },
          )
        }}
      />
    </div>
  )
}
