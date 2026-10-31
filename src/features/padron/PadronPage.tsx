import { UserPlus } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Paginacion } from '@/components/ui/Paginacion'
import { EncabezadoPagina, PanelListado } from '@/components/ui/PanelListado'
import { usePadron, type PadronFiltros } from '@/features/padron/api'
import { FiltrosPadron } from '@/features/padron/components/FiltrosPadron'
import { PanelCliente } from '@/features/padron/components/PanelCliente'
import { TablaPadron } from '@/features/padron/components/TablaPadron'
import { usePadronParams } from '@/features/padron/usePadronParams'
import { formatNumber } from '@/lib/format'

/**
 * El padrón de participantes de sorteos.
 *
 * Es la lista de la gente que dejó sus datos en `/public/clientes`, y la única
 * pantalla desde la que se pueden corregir o borrar. Lo segundo no es un extra:
 * el texto de consentimiento que cada persona acepta dice "puedo pedir que los
 * borren cuando quiera, en el local", y hasta que existió esta pantalla eso sólo
 * se podía cumplir entrando al panel de Supabase.
 *
 * ── Qué NO hace, y es deliberado ───────────────────────────────────────────
 * No elige ganadores y no exporta. Lo primero es la fase siguiente del módulo de
 * sorteos; lo segundo todavía no lo pidió nadie, y una exportación de datos
 * personales es una decisión, no una conveniencia.
 */

export function PadronPage() {
  const { filtros, setFiltros, setPagina, setOrden, fichaAbierta, setFichaAbierta } =
    usePadronParams()
  const { data, isPending, isError, isFetching, refetch } = usePadron(filtros)

  const onCambioFiltros = useCallback(
    (cambios: Partial<Pick<PadronFiltros, 'busqueda' | 'verificados'>>) => {
      setFiltros(cambios)
    },
    [setFiltros],
  )

  const cerrarFicha = useCallback(() => setFichaAbierta(null), [setFichaAbierta])

  /**
   * La ficha sale del listado que ya está en memoria, no de una consulta aparte:
   * la fila tiene todo lo que el panel muestra.
   *
   * Si el id de la URL no está en la página actual —un enlace viejo, o una fila
   * que se fue del filtro— el panel no se abre en vez de abrirse vacío.
   */
  const clienteAbierto = useMemo(() => {
    if (!fichaAbierta || fichaAbierta === 'nuevo') return null
    const id = Number(fichaAbierta)
    if (!Number.isInteger(id)) return null
    return data?.filas.find((fila) => fila.id === id) ?? null
  }, [fichaAbierta, data])

  const panelAbierto = fichaAbierta === 'nuevo' || clienteAbierto !== null

  const hayFilas = (data?.filas.length ?? 0) > 0
  const hayFiltrosActivos = filtros.busqueda.trim() !== '' || filtros.verificados !== 'todos'

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Padrón de sorteos"
        detalle={
          data
            ? `${formatNumber(data.total)} ${data.total === 1 ? 'persona anotada' : 'personas anotadas'}`
            : 'Quiénes dejaron sus datos para participar'
        }
        refrescando={isFetching && !isPending}
        accion={
          <Button size="sm" onClick={() => setFichaAbierta('nuevo')}>
            <UserPlus className="size-4" aria-hidden />
            Agregar
          </Button>
        }
      />

      <FiltrosPadron filtros={filtros} onChange={onCambioFiltros} />

      <PanelListado
        cargando={isPending}
        atenuado={isFetching}
        error={
          isError ? (
            <ErrorState
              description="No pudimos traer el padrón. Si el error se repite, puede faltar aplicar la sección EL PANEL de schema_clientes.sql en el backend."
              onRetry={() => void refetch()}
            />
          ) : null
        }
        vacio={
          hayFilas ? null : (
            <EmptyState
              title={hayFiltrosActivos ? 'Nadie coincide con la búsqueda' : 'Todavía no hay nadie'}
              description={
                hayFiltrosActivos
                  ? 'Probá con otro texto, o quitá el filtro de celular verificado.'
                  : 'Cuando alguien complete el formulario público, aparece acá. También podés agregar a alguien a mano.'
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
            filas="personas"
          />
        }
      >
        {data ? (
          <TablaPadron
            filas={data.filas}
            orden={filtros.orden}
            direccion={filtros.direccion}
            onOrdenar={setOrden}
            onAbrir={(id) => setFichaAbierta(String(id))}
          />
        ) : null}
      </PanelListado>

      {panelAbierto ? (
        <PanelCliente
          // La `key` remonta el panel al cambiar de ficha: sin ella, abrir otra
          // persona dejaría el borrador de la anterior escrito en los campos.
          key={fichaAbierta}
          cliente={clienteAbierto}
          modo={fichaAbierta === 'nuevo' ? 'nuevo' : 'ver'}
          onCerrar={cerrarFicha}
        />
      ) : null}
    </div>
  )
}
