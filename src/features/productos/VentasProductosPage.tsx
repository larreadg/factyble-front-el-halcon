import { PackageSearch } from 'lucide-react'
import { useState } from 'react'

import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EncabezadoPagina } from '@/components/ui/PanelListado'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useVentasPorProducto } from '@/features/productos/api'
import { SelectorProductos } from '@/features/productos/components/SelectorProductos'
import { TablaVentasProductos } from '@/features/productos/components/TablaVentasProductos'
import { useProductosParams } from '@/features/productos/useProductosParams'
import { useRangoParams } from '@/hooks/useRangoParams'
import { diasEnRango, formatRango } from '@/lib/dates'
import { formatNumber } from '@/lib/format'

/**
 * Cuánto se vendió de X, Y, Z en un período.
 *
 * El dashboard contesta "qué se vendió más"; esta pantalla contesta la pregunta
 * al revés: el usuario ya sabe qué artículos le importan y quiere sus números.
 * Rango y selección viven en la URL, así que una consulta armada se guarda como
 * marcador o se manda por WhatsApp tal cual.
 */
export function VentasProductosPage() {
  const { range, setRange } = useRangoParams()
  const { elegidos, agregar, quitar, limpiar } = useProductosParams()
  const ventas = useVentasPorProducto(range, elegidos)

  // Nombres de lo que se eligió en ESTA sesión, para que el chip diga la
  // descripción apenas se hace click, sin esperar la respuesta de las ventas. Lo
  // que viene de la URL lo nombra la RPC de ventas, que devuelve la descripción
  // de cada clave pedida.
  const [nombresLocales, setNombresLocales] = useState<Record<string, string>>({})
  const nombres: Record<string, string> = { ...nombresLocales }
  for (const fila of ventas.data ?? []) nombres[fila.clave] = fila.descripcion

  // `keepPreviousData` deja a la vista la respuesta anterior mientras llega la
  // nueva; las filas de claves que ya se quitaron no se muestran.
  const elegidosSet = new Set(elegidos)
  const filas = (ventas.data ?? []).filter((fila) => elegidosSet.has(fila.clave))
  const dias = diasEnRango(range)

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
        <EncabezadoPagina
          titulo="Ventas por producto"
          detalle={
            <span className="tabular-nums">
              {formatRango(range)}
              <span className="text-slate-400">
                {' '}
                · {formatNumber(dias)} {dias === 1 ? 'día' : 'días'}
              </span>
            </span>
          }
          refrescando={ventas.isFetching && !ventas.isPending}
        />
        <DateRangePicker value={range} onChange={setRange} className="lg:items-end" />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Productos" description="Elegí uno o varios para sumar lo vendido" />
          <CardBody>
            <SelectorProductos
              elegidos={elegidos}
              nombres={nombres}
              onAgregar={(producto) => {
                setNombresLocales((previos) => ({
                  ...previos,
                  [producto.clave]: producto.descripcion ?? producto.clave,
                }))
                agregar(producto.clave)
              }}
              onQuitar={quitar}
              onLimpiar={limpiar}
            />
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Vendido en el período"
            description="Sólo facturas aprobadas. Las canceladas no cuentan"
          />
          {elegidos.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-5" aria-hidden />}
              title="Elegí productos para ver cuánto se vendió"
              description="Buscalos por descripción o código en el panel de productos. Se suman en el rango de fechas de arriba."
            />
          ) : ventas.isPending ? (
            <SkeletonRows rows={Math.min(elegidos.length + 1, 8)} className="p-4" />
          ) : ventas.isError ? (
            <ErrorState
              description={
                (ventas.error as { code?: unknown } | null)?.code === 'PGRST202'
                  ? 'Falta crear la función en la base. Aplicá supabase/schema.sql del backend.'
                  : undefined
              }
              onRetry={() => void ventas.refetch()}
            />
          ) : (
            <div
              className={
                ventas.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'
              }
            >
              <TablaVentasProductos data={filas} onQuitar={quitar} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
