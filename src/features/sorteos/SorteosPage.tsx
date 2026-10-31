import { Gift, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EncabezadoPagina, PanelListado } from '@/components/ui/PanelListado'
import { useSorteos } from '@/features/sorteos/api'
import { FiltrosSorteos } from '@/features/sorteos/components/FiltrosSorteos'
import { TablaSorteos } from '@/features/sorteos/components/TablaSorteos'
import { useSorteosParams } from '@/features/sorteos/useSorteosParams'
import { mensajeDeError } from '@/features/sorteos/errores'
import { formatNumber, pluralize } from '@/lib/format'

export function SorteosPage() {
  const { filtros, setFiltros } = useSorteosParams()
  const { data, isPending, isError, isFetching, error, refetch } = useSorteos(filtros)

  const filas = data ?? []
  const hayFiltros = filtros.busqueda.trim() !== '' || filtros.estado !== 'todos'

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Sorteos por marca"
        detalle={
          isPending
            ? 'Cargando…'
            : `${formatNumber(filas.length)} ${pluralize(filas.length, 'sorteo', 'sorteos')}`
        }
        refrescando={isFetching && !isPending}
        accion={
          <Link to="/sorteos/nuevo" className={buttonClass({ size: 'sm' })}>
            <Plus className="size-4" aria-hidden />
            Nuevo sorteo
          </Link>
        }
      />

      <FiltrosSorteos filtros={filtros} onChange={setFiltros} />

      {/* Sin `pie`: este listado no pagina. Los sorteos de una ferretería se
          cuentan con los dedos y la consulta los trae todos, así que un pie que
          diga «Mostrando 1–4 de 4» sería una barra para no decir nada. */}
      <PanelListado
        cargando={isPending}
        atenuado={isFetching}
        filasEsqueleto={6}
        error={
          isError ? (
            <ErrorState
              description={mensajeDeError(error, 'No pudimos traer los sorteos.')}
              onRetry={() => void refetch()}
            />
          ) : null
        }
        vacio={
          filas.length > 0 ? null : hayFiltros ? (
            <EmptyState
              title="Ningún sorteo coincide"
              description="Probá con otro texto o quitá el filtro de estado."
            />
          ) : (
            <EmptyState
              icon={<Gift className="size-5" aria-hidden />}
              title="Todavía no hay sorteos"
              description="Un sorteo se arma en tres pasos: se define el período, se eligen las marcas del catálogo y se cargan los premios."
            />
          )
        }
      >
        <TablaSorteos filas={filas} />
      </PanelListado>
    </div>
  )
}
