import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  useActualizarSorteo,
  useCambiarEstado,
  useCrearSorteo,
  useEliminarSorteo,
  useEmpresas,
  useSorteo,
} from '@/features/sorteos/api'
import { EditorPremios } from '@/features/sorteos/components/EditorPremios'
import { EstadoSorteoBadge } from '@/features/sorteos/components/EstadoSorteoBadge'
import {
  FormularioDefinicion,
  type DefinicionGuardada,
} from '@/features/sorteos/components/FormularioDefinicion'
import { PanelEjecucion } from '@/features/sorteos/components/PanelEjecucion'
import { PanelPublicacion } from '@/features/sorteos/components/PanelPublicacion'
import {
  Seccion,
  SeccionBloqueada,
  type EstadoSeccion,
} from '@/features/sorteos/components/Seccion'
import { SelectorMarcas } from '@/features/sorteos/components/SelectorMarcas'
import { SwitchEnmascarar } from '@/features/sorteos/components/SwitchEnmascarar'
import { PanelGanadores } from '@/features/sorteos/components/TablaGanadores'
import { esEditable } from '@/features/sorteos/estados'
import { esConflictoDeEstado, mensajeDeError } from '@/features/sorteos/errores'

/**
 * Alta y edición de un sorteo, en tres pasos que son los del propio dato.
 *
 * ── Por qué el alta crea la fila antes de terminar el formulario ────────────
 * `sorteo_marca` y `sorteo_premio` son hijas: no se pueden insertar sin un
 * `sorteo_id`, y PostgREST no tiene transacciones multi-tabla. Un formulario que
 * juntara todo en memoria y lo mandara al final tendría que resolver qué hacer
 * cuando la cabecera entra y los premios no.
 *
 * Así que el paso 1 guarda y crea un BORRADOR; los pasos 2 y 3 editan un sorteo
 * que ya existe, y cada cambio se guarda solo. Lo peor que puede dejar un corte de
 * luz es un borrador incompleto — que es exactamente lo que es, que la URL permite
 * retomar, y que la base no deja publicar hasta que esté completo.
 */
export function SorteoFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const empresas = useEmpresas()
  const detalle = useSorteo(id)

  const crear = useCrearSorteo()
  const actualizar = useActualizarSorteo()
  const cambiarEstado = useCambiarEstado()
  const eliminar = useEliminarSorteo()

  const esNuevo = id === undefined
  const sorteo = detalle.data?.sorteo
  const marcas = detalle.data?.marcas ?? []
  const premios = detalle.data?.premios ?? []

  const editable = sorteo ? esEditable(sorteo.estado) : false
  const cargando = empresas.isPending || (!esNuevo && detalle.isPending)

  function guardarDefinicion(valores: DefinicionGuardada) {
    if (esNuevo) {
      crear.mutate(valores, {
        // `replace`: el paso 1 no es una pantalla a la que tenga sentido volver
        // con el botón atrás — el sorteo ya existe y su URL es la del sorteo.
        onSuccess: (nuevo) => void navigate(`/sorteos/${nuevo.id}`, { replace: true }),
      })
      return
    }
    if (!sorteo) return
    const { empresa_id: _empresa, ...cambios } = valores
    actualizar.mutate({ id: sorteo.id, cambios })
  }

  /** Si la base rechazó por estado, lo que muestra la pantalla ya es viejo. */
  function alFallarPorEstado(fallo: unknown) {
    if (esConflictoDeEstado(fallo)) void detalle.refetch()
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <SkeletonRows rows={2} />
        <Card className="p-5">
          <SkeletonRows rows={7} />
        </Card>
      </div>
    )
  }

  if (empresas.isError) {
    return (
      <ErrorState
        title="No pudimos leer las empresas"
        description={mensajeDeError(empresas.error, 'Reintentá en unos segundos.')}
        onRetry={() => void empresas.refetch()}
      />
    )
  }

  if ((empresas.data ?? []).length === 0) {
    return (
      <ErrorState
        title="Todavía no hay ninguna empresa en el espejo"
        description="Un sorteo pertenece a una empresa, y el espejo se llena desde el on-prem. Corré el sync de facturas o de marcas y volvé a entrar."
      />
    )
  }

  if (!esNuevo && (detalle.isError || !sorteo)) {
    return (
      <ErrorState
        title="No encontramos ese sorteo"
        description={mensajeDeError(detalle.error, 'Puede haber sido eliminado.')}
        onRetry={() => void detalle.refetch()}
      />
    )
  }

  const estadoMarcas: EstadoSeccion = !sorteo
    ? 'bloqueada'
    : !editable
      ? 'bloqueada'
      : marcas.length > 0
        ? 'completa'
        : 'pendiente'

  const estadoPremios: EstadoSeccion = !sorteo
    ? 'bloqueada'
    : !editable
      ? 'bloqueada'
      : premios.length > 0
        ? 'completa'
        : 'pendiente'

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/sorteos"
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Sorteos
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {sorteo ? sorteo.nombre : 'Nuevo sorteo'}
          </h2>
          {sorteo ? <EstadoSorteoBadge estado={sorteo.estado} /> : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {sorteo
            ? 'Se sortea por marca: las marcas del sorteo son las que van a definir quién participa.'
            : 'Guardá la definición para poder elegir las marcas y cargar los premios.'}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-4">
          {/* Con el sorteo ya hecho, lo primero que se necesita es a quién
              avisarle. La configuración queda abajo: ya no se puede cambiar. */}
          {sorteo && sorteo.estado === 'SORTEADO' ? (
            <PanelGanadores sorteoId={Number(sorteo.id)} />
          ) : null}

          <Card className="divide-y divide-slate-100 overflow-hidden">
            <Seccion
              numero={1}
              titulo="Definición"
              descripcion="Qué sorteo es y en qué período se participa."
              estado={sorteo ? 'completa' : 'pendiente'}
            >
              {sorteo && sorteo.estado === 'SORTEADO' ? (
                <div className="space-y-3">
                  <SeccionBloqueada>
                    El sorteo ya fue sorteado, así que su definición queda como quedó.
                  </SeccionBloqueada>
                  <FormularioDefinicion
                    key={sorteo.id}
                    sorteo={sorteo}
                    empresas={empresas.data ?? []}
                    soloLectura
                    onGuardar={() => {}}
                  />
                </div>
              ) : (
                <FormularioDefinicion
                  key={sorteo?.id ?? 'nuevo'}
                  sorteo={sorteo}
                  empresas={empresas.data ?? []}
                  guardando={crear.isPending || actualizar.isPending}
                  textoGuardar={esNuevo ? 'Crear borrador y continuar' : 'Guardar cambios'}
                  onGuardar={guardarDefinicion}
                />
              )}

              {crear.error || actualizar.error ? (
                <p className="mt-3 text-xs text-red-600">
                  {mensajeDeError(crear.error ?? actualizar.error)}
                </p>
              ) : null}

              {/* Se guarda solo y no viaja con el formulario: es el único ajuste que
                un sorteo ya sorteado sigue admitiendo, y la pantalla que se graba
                lo necesita decidido ANTES de sortear. */}
              {sorteo ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <SwitchEnmascarar sorteo={sorteo} />
                </div>
              ) : null}
            </Seccion>

            <Seccion
              numero={2}
              titulo="Marcas"
              descripcion="Qué marcas participan. Se eligen del catálogo replicado desde el sistema de ventas."
              estado={estadoMarcas}
            >
              {!sorteo ? (
                <SeccionBloqueada>
                  Disponible en cuanto exista el borrador: una marca se asocia a un sorteo, y el
                  sorteo todavía no está creado.
                </SeccionBloqueada>
              ) : !editable ? (
                <MarcasSoloLectura nombres={marcas.map((marca) => marca.marca_nombre)} />
              ) : (
                <SelectorMarcas
                  sorteoId={sorteo.id}
                  empresaId={sorteo.empresa_id}
                  elegidas={marcas}
                  premios={premios}
                />
              )}
            </Seccion>

            <Seccion
              numero={3}
              titulo="Premios"
              descripcion="Qué se sortea, en orden. El primero de la lista es el primer premio."
              estado={estadoPremios}
            >
              {!sorteo ? (
                <SeccionBloqueada>Disponible en cuanto exista el borrador.</SeccionBloqueada>
              ) : !editable ? (
                <div className="space-y-3">
                  <EditorPremios
                    sorteoId={sorteo.id}
                    premios={premios}
                    marcas={marcas}
                    soloLectura
                  />
                  {premios.length > 0 ? (
                    <SeccionBloqueada>
                      Los premios se editan con el sorteo en borrador. Para cambiarlos, volvelo a
                      borrador desde el panel de estado.
                    </SeccionBloqueada>
                  ) : null}
                </div>
              ) : (
                <EditorPremios sorteoId={sorteo.id} premios={premios} marcas={marcas} />
              )}
            </Seccion>
          </Card>
        </div>

        {sorteo ? (
          <div className="space-y-4 xl:sticky xl:top-4">
            <PanelPublicacion
              sorteo={sorteo}
              cantidadMarcas={marcas.length}
              cantidadPremios={premios.length}
              cambiando={cambiarEstado.isPending}
              eliminando={eliminar.isPending}
              error={cambiarEstado.error ?? eliminar.error}
              onCambiarEstado={(destino) =>
                cambiarEstado.mutate(
                  { id: sorteo.id, estado: destino },
                  { onError: alFallarPorEstado },
                )
              }
              onEliminar={() =>
                eliminar.mutate(sorteo, {
                  onSuccess: () => void navigate('/sorteos', { replace: true }),
                })
              }
            />

            {/* Sortear si está cerrado, la constancia si ya se sorteó. En cualquier
                otro estado no hay nada que ofrecer: se encarga de no dibujarse. */}
            <PanelEjecucion sorteo={sorteo} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Las marcas y los premios de un sorteo ya publicado se muestran, no se editan. El
 * camino para cambiarlos es volver el sorteo a borrador, y el panel de la derecha
 * es donde vive esa acción: repetirla acá la duplicaría en dos lugares distintos.
 */
function MarcasSoloLectura({ nombres }: { nombres: string[] }) {
  return (
    <div className="space-y-3">
      {nombres.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {nombres.map((nombre) => (
            <li
              key={nombre}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-600/20 ring-inset"
            >
              {nombre}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">Sin marcas.</p>
      )}
      <SeccionBloqueada>
        Las marcas se editan con el sorteo en borrador. Para cambiarlas, volvelo a borrador desde el
        panel de estado.
      </SeccionBloqueada>
    </div>
  )
}
