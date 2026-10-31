import { useCallback } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Paginacion } from '@/components/ui/Paginacion'
import { EncabezadoPagina, PanelListado } from '@/components/ui/PanelListado'
import {
  sanitizarBusqueda,
  useFacturas,
  type AmbitoBusqueda,
  type FacturasFiltros,
} from '@/features/facturas/api'
import { DetalleFacturaPanel } from '@/features/facturas/components/DetalleFacturaPanel'
import { FiltrosFacturas } from '@/features/facturas/components/FiltrosFacturas'
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
      <EncabezadoPagina
        titulo="Facturas electrónicas"
        detalle={formatRango(filtros.range)}
        refrescando={isFetching && !isPending}
      />

      <FiltrosFacturas filtros={filtros} onChange={onCambioFiltros} />

      <PanelListado
        cargando={isPending}
        atenuado={isFetching}
        error={
          isError ? (
            <ErrorState
              description="No pudimos traer las facturas desde el servidor."
              onRetry={() => void refetch()}
            />
          ) : null
        }
        vacio={
          hayFilas ? null : (
            <EmptyState
              title="Sin facturas en el período"
              description={
                descripcionSinCoincidencias ??
                (hayFiltrosActivos
                  ? 'Probá ampliar el rango de fechas o quitar algún filtro.'
                  : 'No hay facturas emitidas en el rango seleccionado.')
              }
            />
          )
        }
        pie={
          <Paginacion
            pagina={filtros.pagina}
            tamanio={filtros.tamanio}
            total={data?.total ?? 0}
            onPagina={setPagina}
            onTamanio={(tamanio) => setFiltros({ tamanio })}
            filas="facturas"
          />
        }
      >
        {data ? (
          <TablaFacturas
            filas={data.filas}
            orden={filtros.orden}
            direccion={filtros.direccion}
            onOrdenar={setOrden}
            onVerDetalle={setFacturaAbierta}
          />
        ) : null}
      </PanelListado>

      <DetalleFacturaPanel
        facturaId={facturaAbierta}
        termino={terminoItems}
        onCerrar={cerrarDetalle}
      />
    </div>
  )
}
