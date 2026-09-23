import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import {
  usePorPeriodo,
  useResumen,
  useTopMarcas,
  useTopProductos,
  useTopReceptores,
  useUltimasFacturas,
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

  const resumen = useResumen(range)
  const periodo = usePorPeriodo(range, granularidad)
  const receptores = useTopReceptores(range, 10)
  const productos = useTopProductos(range, 10)
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
          al lado del otro para poder leerlos juntos. */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
        <Bloque
          title="Productos más vendidos"
          description="Por unidades facturadas en el período"
          isPending={productos.isPending}
          isError={productos.isError}
          error={productos.error}
          vacio={productos.data?.length === 0}
          mensajeVacio="Sin productos facturados en el período"
          onRetry={() => void productos.refetch()}
          skeleton={<SkeletonRows rows={8} />}
        >
          {productos.data ? <TopProductos data={productos.data} /> : null}
        </Bloque>

        <Bloque
          title="Marcas más vendidas"
          // El criterio es distinto al de productos (monto vs unidades) y la RPC
          // deja fuera los ítems sin marca: las dos cosas se dicen acá, porque
          // si no el bloque parece no cuadrar con el resto del dashboard.
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
