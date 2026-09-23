import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  sanitizarBusqueda,
  useFacturas,
  type AmbitoBusqueda,
  type FacturasFiltros,
} from '@/features/facturas/api'
import { DetalleFacturaPanel } from '@/features/facturas/components/DetalleFacturaPanel'
import { FiltrosFacturas } from '@/features/facturas/components/FiltrosFacturas'
import { Paginacion } from '@/features/facturas/components/Paginacion'
import { TablaFacturas } from '@/features/facturas/components/TablaFacturas'
import { useFacturasParams } from '@/features/facturas/useFacturasParams'
import { formatRango } from '@/lib/dates'

/**
 * Qué decir cuando la búsqueda no trajo nada, por ámbito. `todo` y `documento`
 * no están: ahí el término compite con los filtros de cabecera y el mensaje
 * genérico ("ampliar el rango") sigue siendo el consejo correcto.
 */
const SIN_COINCIDENCIAS: Partial<Record<AmbitoBusqueda, string>> = {
  item: 'Ningún ítem facturado en el período coincide con ese texto. Probá con una parte de la descripción.',
  marca:
    'Ninguna factura del período tiene ítems de una marca que coincida con ese texto. Probá con una parte del nombre de la marca.',
}

export function FacturasPage() {
  const { filtros, setFiltros, setPagina, setOrden, facturaAbierta, setFacturaAbierta } =
    useFacturasParams()
  const { data, isPending, isError, isFetching, refetch } = useFacturas(filtros)

  const onCambioFiltros = useCallback(
    (
      cambios: Partial<
        Pick<FacturasFiltros, 'range' | 'estado' | 'condicion' | 'busqueda' | 'ambito'>
      >,
    ) => {
      setFiltros(cambios)
    },
    [setFiltros],
  )

  const cerrarDetalle = useCallback(() => setFacturaAbierta(null), [setFacturaAbierta])

  // El panel resalta los ítems buscados, salvo cuando la búsqueda es sólo de cabecera.
  const terminoItems =
    filtros.ambito === 'documento' ? undefined : sanitizarBusqueda(filtros.busqueda) || undefined

  const hayFilas = (data?.filas.length ?? 0) > 0
  const hayTermino = filtros.busqueda.trim() !== ''
  const hayFiltrosActivos =
    hayTermino || filtros.estado !== 'todos' || filtros.condicion !== 'todas'

  // Cuando el ámbito mira DENTRO de la factura, el vacío no se arregla tocando
  // los filtros de cabecera: lo que no coincidió es el contenido. Decirlo evita
  // mandar al usuario a ampliar el rango cuando el problema es el texto.
  const descripcionSinCoincidencias = hayTermino ? SIN_COINCIDENCIAS[filtros.ambito] : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Facturas electrónicas</h2>
        <p className="text-sm text-slate-500">{formatRango(filtros.range)}</p>
      </div>

      <FiltrosFacturas filtros={filtros} onChange={onCambioFiltros} />

      <Card className="overflow-hidden">
        {/* Indicador sutil mientras se refresca una página ya visible. */}
        <div className="flex h-8 items-center justify-end border-b border-slate-100 px-4">
          {isFetching && !isPending ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Actualizando…
            </span>
          ) : null}
        </div>

        {isPending ? <SkeletonRows rows={8} className="p-4" /> : null}

        {!isPending && isError ? (
          <ErrorState
            description="No pudimos traer las facturas desde el servidor."
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isPending && !isError && !hayFilas ? (
          <EmptyState
            title="Sin facturas en el período"
            description={
              descripcionSinCoincidencias ??
              (hayFiltrosActivos
                ? 'Probá ampliar el rango de fechas o quitar algún filtro.'
                : 'No hay facturas emitidas en el rango seleccionado.')
            }
          />
        ) : null}

        {!isPending && !isError && hayFilas && data ? (
          <TablaFacturas
            filas={data.filas}
            orden={filtros.orden}
            direccion={filtros.direccion}
            onOrdenar={setOrden}
            onVerDetalle={setFacturaAbierta}
            atenuada={isFetching}
          />
        ) : null}

        {!isPending && !isError ? (
          <Paginacion
            pagina={filtros.pagina}
            tamanio={filtros.tamanio}
            total={data?.total ?? 0}
            onPagina={setPagina}
            onTamanio={(tamanio) => setFiltros({ tamanio })}
          />
        ) : null}
      </Card>

      <DetalleFacturaPanel
        facturaId={facturaAbierta}
        termino={terminoItems}
        onCerrar={cerrarDetalle}
      />
    </div>
  )
}
