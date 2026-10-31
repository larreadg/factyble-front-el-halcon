import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Select } from '@/components/ui/Select'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import {
  ORDEN_TOP_PRODUCTOS,
  ORDEN_TOP_PRODUCTOS_DEFECTO,
  ORDEN_TOP_PRODUCTOS_OPCIONES,
  usePorPeriodo,
  useResumen,
  useTopMarcas,
  useTopProductos,
  useTopReceptores,
  useUltimasFacturas,
  type OrdenTopProductos,
} from '@/features/dashboard/api'
import { Bloque } from '@/features/dashboard/components/Bloque'
import { EncabezadoPeriodo } from '@/features/dashboard/components/EncabezadoPeriodo'
import { FacturacionChart } from '@/features/dashboard/components/FacturacionChart'
import { ResumenMetricas } from '@/features/dashboard/components/ResumenMetricas'
import { TopClientes } from '@/features/dashboard/components/TopClientes'
import { TopMarcas } from '@/features/dashboard/components/TopMarcas'
import { TopProductos } from '@/features/dashboard/components/TopProductos'
import { UltimasFacturas } from '@/features/dashboard/components/UltimasFacturas'
import { useRangoParams } from '@/hooks/useRangoParams'
import { diasEnRango, granularidadPara } from '@/lib/dates'
import { formatNumber, toNumber } from '@/lib/format'

const DETALLE_GRANULARIDAD = {
  day: 'día a día',
  week: 'por semana',
  month: 'por mes',
} as const

export function DashboardPage() {
  const { range, setRange } = useRangoParams()
  const granularidad = granularidadPara(range)
  const dias = diasEnRango(range)

  // El criterio del top de productos es estado local, no un parámetro de la URL
  // como el rango: el rango define QUÉ se está mirando y por eso la vista se
  // comparte con él puesto, mientras que esto es cómo se ordena un bloque. La
  // consulta sí lo lleva en la queryKey, así que ir y volver entre criterios no
  // vuelve a pegarle a la base.
  const [ordenProductos, setOrdenProductos] = useState<OrdenTopProductos>(
    ORDEN_TOP_PRODUCTOS_DEFECTO,
  )

  const resumen = useResumen(range)
  const periodo = usePorPeriodo(range, granularidad)
  const receptores = useTopReceptores(range, 10)
  const productos = useTopProductos(range, 10, ordenProductos)
  const marcas = useTopMarcas(range, 10)
  const ultimas = useUltimasFacturas(5)

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-3 sm:space-y-4">
      <EncabezadoPeriodo
        range={range}
        onChange={setRange}
        detalle={`${formatNumber(dias)} ${dias === 1 ? 'día' : 'días'}, ${DETALLE_GRANULARIDAD[granularidad]}`}
      />

      <ResumenMetricas
        data={resumen.data}
        isPending={resumen.isPending}
        isError={resumen.isError}
        onRetry={() => void resumen.refetch()}
      />

      <Bloque
        title="Facturación en el tiempo"
        description={`Total aprobado ${DETALLE_GRANULARIDAD[granularidad]}, contra el promedio del período`}
        isPending={periodo.isPending}
        isError={periodo.isError}
        vacio={periodo.data?.every((fila) => toNumber(fila.total) === 0) ?? true}
        onRetry={() => void periodo.refetch()}
        skeleton={<Skeleton className="h-72 w-full" />}
      >
        {periodo.data ? <FacturacionChart data={periodo.data} granularidad={granularidad} /> : null}
      </Bloque>

      {/* Qué se vendió: los dos rankings del mismo dato a distinta altura, uno
          al lado del otro para poder leerlos juntos. Los dos arrancan por monto
          facturado, así que se comparan directo; el de productos además se puede
          pasar a unidades. */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
        <Bloque
          title="Productos más vendidos"
          // El encabezado dice el criterio vigente porque el ranking cambia de
          // filas al cambiarlo, no sólo de orden: las diez que más facturan no
          // son las diez que más rotan reacomodadas.
          description={ORDEN_TOP_PRODUCTOS[ordenProductos].descripcion}
          action={
            <Select
              aria-label="Criterio del ranking de productos"
              value={ordenProductos}
              onChange={(evento) => setOrdenProductos(evento.target.value as OrdenTopProductos)}
              options={ORDEN_TOP_PRODUCTOS_OPCIONES}
              className="py-1 pr-8 pl-2.5 text-xs"
              contenedorClassName="shrink-0"
            />
          }
          isPending={productos.isPending}
          isError={productos.isError}
          error={productos.error}
          vacio={productos.data?.length === 0}
          mensajeVacio="Sin productos facturados en el período"
          onRetry={() => void productos.refetch()}
          skeleton={<SkeletonRows rows={8} />}
        >
          {productos.data ? <TopProductos data={productos.data} orden={ordenProductos} /> : null}
        </Bloque>

        <Bloque
          title="Marcas más vendidas"
          // El criterio acá es fijo, y la RPC deja fuera los ítems sin marca: eso
          // último se dice en el encabezado, porque si no lo que suma el bloque
          // parece no cuadrar con el total facturado del período.
          description="Por monto facturado. No incluye ítems sin marca"
          isPending={marcas.isPending}
          isError={marcas.isError}
          error={marcas.error}
          vacio={marcas.data?.length === 0}
          mensajeVacio="Sin marcas registradas en el período"
          onRetry={() => void marcas.refetch()}
          skeleton={<SkeletonRows rows={8} />}
        >
          {marcas.data ? <TopMarcas data={marcas.data} /> : null}
        </Bloque>
      </div>

      {/* A quién se le vendió, y qué entró último. */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
        <Bloque
          title="Clientes con mayor facturación"
          description="Los diez primeros del período"
          isPending={receptores.isPending}
          isError={receptores.isError}
          vacio={receptores.data?.length === 0}
          onRetry={() => void receptores.refetch()}
          skeleton={<SkeletonRows rows={8} />}
        >
          {receptores.data ? <TopClientes data={receptores.data} /> : null}
        </Bloque>

        <Bloque
          title="Últimas facturas"
          description="Lo último sincronizado, sin filtrar por período"
          action={
            <Link
              to="/facturas"
              className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium text-accent-700 transition-colors hover:text-accent-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Ver todas
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
          isPending={ultimas.isPending}
          isError={ultimas.isError}
          vacio={ultimas.data?.length === 0}
          mensajeVacio="Todavía no hay facturas sincronizadas"
          onRetry={() => void ultimas.refetch()}
          skeleton={<SkeletonRows rows={5} />}
        >
          {ultimas.data ? <UltimasFacturas data={ultimas.data} /> : null}
        </Bloque>
      </div>
    </div>
  )
}
