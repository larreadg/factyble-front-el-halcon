import { AlertCircle, BadgeCheck, Building2, History, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  useActualizarCliente,
  useCiudades,
  useCrearCliente,
  useEliminarCliente,
  useHistorial,
} from '@/features/padron/api'
import { mensajeDeError } from '@/features/padron/errores'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/dates'
import {
  baseDeDocumento,
  dvDeDocumento,
  esEmpresa as esRucDeEmpresa,
  formatearTelefono,
  normalizarDocumento,
  normalizarNombre,
  normalizarRazonSocial,
  normalizarTelefono,
} from '@/lib/paraguay'
import type { Ciudad, ClienteSorteoListado } from '@/types/database'

/**
 * La ficha de una persona del padrón: verla, editarla, borrarla — y el alta.
 *
 * ── Por qué un panel y no un modal ─────────────────────────────────────────
 * Es la misma razón que explica `ConfirmDialog`: un modal sirve para IMPEDIR
 * seguir hasta que alguien decida, y editar no es eso. Acá se puede leer la
 * tabla de atrás mientras se corrige un teléfono, y cerrar no pierde el contexto.
 * El único modal de esta pantalla es el de borrar, que sí es irreversible.
 *
 * ── Alta y edición en el mismo componente ──────────────────────────────────
 * Los campos son los mismos cuatro y las reglas también. Separarlos daría dos
 * formularios que hay que mantener iguales, que es como terminan distintos.
 *
 * ── Lo que se ve pero no se toca ───────────────────────────────────────────
 * Cuándo se anotó, de qué campaña vino, si su celular está verificado, si el
 * nombre salió de una factura, y qué se le cambió antes. Son HECHOS sobre cómo
 * llegó ese dato: editarlos no corregiría nada, sólo borraría el rastro.
 */

interface PanelClienteProps {
  /** La fila del listado, o `null` cuando se está dando de alta. */
  cliente: ClienteSorteoListado | null
  modo: 'ver' | 'nuevo'
  onCerrar: () => void
}

interface Borrador {
  nombre: string
  documento: string
  telefono: string
  ciudadId: string
}

function borradorDe(cliente: ClienteSorteoListado | null): Borrador {
  if (!cliente) return { nombre: '', documento: '', telefono: '', ciudadId: '' }
  return {
    nombre: cliente.nombre,
    // El documento se muestra como la persona lo reconoce —con el DV si lo
    // dio—, aunque la base lo guarde partido en dos columnas.
    documento: cliente.ruc ?? cliente.documento,
    telefono: cliente.telefono,
    ciudadId: String(cliente.ciudad_id),
  }
}

export function PanelCliente({ cliente, modo, onCerrar }: PanelClienteProps) {
  const ciudades = useCiudades()
  const historial = useHistorial(cliente?.id ?? null)
  const crear = useCrearCliente()
  const actualizar = useActualizarCliente()
  const eliminar = useEliminarCliente()

  const [borrador, setBorrador] = useState<Borrador>(() => borradorDe(cliente))
  const [errores, setErrores] = useState<Partial<Record<keyof Borrador, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const cerrarRef = useRef<HTMLButtonElement>(null)

  // Al cambiar de ficha, el formulario arranca de cero con los datos nuevos. La
  // clave del `key` en el padre ya remonta el componente, pero esto lo deja
  // correcto también si algún día deja de remontarse.
  const idActual = cliente?.id ?? null
  const ultimoId = useRef(idActual)
  useEffect(() => {
    if (ultimoId.current === idActual) return
    ultimoId.current = idActual
    setBorrador(borradorDe(cliente))
    setErrores({})
    setErrorGeneral(null)
  }, [idActual, cliente])

  useEffect(() => {
    function onTecla(evento: KeyboardEvent) {
      // Con el diálogo de borrado abierto, Esc es suyo: cerrarlo no tiene que
      // cerrar además el panel de atrás.
      if (evento.key === 'Escape' && !confirmandoBorrado) onCerrar()
    }
    window.addEventListener('keydown', onTecla)
    cerrarRef.current?.focus()
    return () => window.removeEventListener('keydown', onTecla)
  }, [onCerrar, confirmandoBorrado])

  const esEmpresa = useMemo(() => {
    const canonico = normalizarDocumento(borrador.documento)
    return canonico !== null && esRucDeEmpresa(baseDeDocumento(canonico))
  }, [borrador.documento])

  const guardando = crear.isPending || actualizar.isPending

  function cambiar(campo: keyof Borrador, valor: string) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
    setErrores((previo) => ({ ...previo, [campo]: undefined }))
    setErrorGeneral(null)
  }

  /**
   * Valida con las mismas reglas que la base y devuelve lo normalizado.
   *
   * Validar acá no reemplaza al CHECK: lo adelanta. La base sigue siendo la que
   * manda, y sus rechazos se traducen en `errores.ts`.
   */
  function preparar(): {
    nombre: string
    documento: string
    documentoDv: string | null
    telefono: string
    ciudadId: number
  } | null {
    const encontrados: Partial<Record<keyof Borrador, string>> = {}

    const canonico = normalizarDocumento(borrador.documento)
    if (!canonico) {
      encontrados.documento = 'Poné el RUC con su dígito verificador, o la cédula sin puntos.'
    }

    // La regla del nombre depende del documento: una razón social puede llevar
    // números ("GRUPO F27 S.A.") y el nombre de una persona no.
    const nombre = esEmpresa
      ? normalizarRazonSocial(borrador.nombre)
      : normalizarNombre(borrador.nombre)
    if (!nombre) {
      encontrados.nombre = esEmpresa
        ? 'La razón social tiene que tener entre 3 y 120 caracteres.'
        : 'Poné nombre y apellido, sin números.'
    }

    const telefono = normalizarTelefono(borrador.telefono)
    if (!telefono) {
      encontrados.telefono = 'Celular de 10 dígitos, por ejemplo 0972 413798.'
    }

    if (!borrador.ciudadId) {
      encontrados.ciudadId = 'Elegí la ciudad.'
    }

    setErrores(encontrados)
    if (Object.values(encontrados).some(Boolean)) return null

    return {
      nombre: nombre as string,
      documento: baseDeDocumento(canonico as string),
      documentoDv: dvDeDocumento(canonico as string),
      telefono: telefono as string,
      ciudadId: Number(borrador.ciudadId),
    }
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorGeneral(null)

    const datos = preparar()
    if (!datos) return

    const alFallar = (causa: unknown) => {
      setErrorGeneral(mensajeDeError(causa))
    }

    if (modo === 'nuevo') {
      crear.mutate(
        {
          nombre: datos.nombre,
          documento: datos.documento,
          documento_dv: datos.documentoDv,
          telefono: datos.telefono,
          ciudad_id: datos.ciudadId,
          // Cargado en el mostrador: ni el nombre salió de una factura ni el
          // celular pasó por un SMS. Decirlo es lo que hace que la columna
          // signifique algo el día del sorteo.
          nombre_verificado: false,
          telefono_verificado: false,
          origen: 'panel',
        },
        { onSuccess: onCerrar, onError: alFallar },
      )
      return
    }

    if (!cliente) return

    // Sólo lo que cambió. Y con ello, la procedencia: un nombre editado a mano
    // ya no es "el de sus facturas", y un teléfono editado a mano no pasó por
    // ningún SMS. Dejar los flags en `true` sería mentir sobre el dato nuevo.
    const cambios: Parameters<typeof actualizar.mutate>[0]['cambios'] = {}
    if (datos.nombre !== cliente.nombre) {
      cambios.nombre = datos.nombre
      cambios.nombre_verificado = false
    }
    if (datos.documento !== cliente.documento) cambios.documento = datos.documento
    if (datos.documentoDv !== cliente.documento_dv) cambios.documento_dv = datos.documentoDv
    if (datos.telefono !== cliente.telefono) {
      cambios.telefono = datos.telefono
      cambios.telefono_verificado = false
    }
    if (datos.ciudadId !== cliente.ciudad_id) cambios.ciudad_id = datos.ciudadId

    if (Object.keys(cambios).length === 0) {
      onCerrar()
      return
    }

    actualizar.mutate({ id: cliente.id, cambios }, { onSuccess: onCerrar, onError: alFallar })
  }

  const titulo = modo === 'nuevo' ? 'Agregar al padrón' : cliente?.nombre || 'Ficha'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <button
        type="button"
        onClick={onCerrar}
        className="animate-velo-entra absolute inset-0 bg-ink-950/50 backdrop-blur-[1px]"
        aria-label="Cerrar la ficha"
      />

      <div className="animate-panel-entra absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl shadow-ink-950/30">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              {cliente?.es_empresa ? (
                <Building2 className="size-3.5 shrink-0 text-slate-400" aria-hidden />
              ) : null}
              <span className="truncate">{titulo}</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {modo === 'nuevo'
                ? 'Para quien no pudo cargarse desde el formulario.'
                : `Se anotó el ${formatDateTime(cliente?.creado_en ?? '')}`}
            </p>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la ficha"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {ciudades.isPending ? <SkeletonRows rows={6} className="p-5" /> : null}

          {ciudades.isError ? (
            <ErrorState
              description="No pudimos traer el catálogo de ciudades."
              onRetry={() => void ciudades.refetch()}
            />
          ) : null}

          {ciudades.data ? (
            <form id="ficha-cliente" onSubmit={guardar} noValidate className="space-y-5 p-5">
              <Campo
                id="ficha-documento"
                etiqueta="RUC o cédula"
                error={errores.documento}
                ayuda="Con el dígito verificador si lo tiene. Un RUC que empieza con 80 es una empresa."
              >
                <Input
                  id="ficha-documento"
                  inputMode="text"
                  autoComplete="off"
                  value={borrador.documento}
                  onChange={(evento) => cambiar('documento', evento.target.value)}
                  aria-invalid={errores.documento ? true : undefined}
                  aria-describedby="ficha-documento-ayuda"
                  placeholder="5249657-4"
                  className={cn('tabular-nums', errores.documento && 'ring-red-400')}
                />
              </Campo>

              <Campo
                id="ficha-nombre"
                etiqueta={esEmpresa ? 'Razón social' : 'Nombre y apellido'}
                error={errores.nombre}
              >
                <Input
                  id="ficha-nombre"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={borrador.nombre}
                  onChange={(evento) => cambiar('nombre', evento.target.value)}
                  aria-invalid={errores.nombre ? true : undefined}
                  aria-describedby={errores.nombre ? 'ficha-nombre-ayuda' : undefined}
                  className={cn('uppercase', errores.nombre && 'ring-red-400')}
                />
              </Campo>

              <Campo id="ficha-telefono" etiqueta="Celular" error={errores.telefono}>
                <Input
                  id="ficha-telefono"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={borrador.telefono}
                  onChange={(evento) => cambiar('telefono', evento.target.value)}
                  aria-invalid={errores.telefono ? true : undefined}
                  aria-describedby={errores.telefono ? 'ficha-telefono-ayuda' : undefined}
                  placeholder="0972413798"
                  className={cn('tabular-nums', errores.telefono && 'ring-red-400')}
                />
              </Campo>

              <Campo id="ficha-ciudad" etiqueta="Ciudad" error={errores.ciudadId}>
                <SelectCiudad
                  ciudades={ciudades.data}
                  value={borrador.ciudadId}
                  onChange={(valor) => cambiar('ciudadId', valor)}
                  invalido={Boolean(errores.ciudadId)}
                />
              </Campo>

              {errorGeneral ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200 ring-inset"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {errorGeneral}
                </p>
              ) : null}
            </form>
          ) : null}

          {modo === 'ver' && cliente ? (
            <>
              <Procedencia cliente={cliente} />
              <Historial
                cambios={historial.data ?? []}
                cargando={historial.isPending}
                ciudades={ciudades.data ?? []}
              />
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          {modo === 'ver' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmandoBorrado(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Borrar del padrón
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="ficha-cliente" size="sm" loading={guardando}>
              {modo === 'nuevo' ? 'Agregar' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        abierto={confirmandoBorrado}
        titulo="Borrar del padrón"
        descripcion={
          <>
            <strong className="font-medium text-slate-900">{cliente?.nombre}</strong> deja de
            participar de los sorteos y sus datos se borran de la base.
          </>
        }
        detalle="Se va también el historial de cambios de esta persona. No se puede deshacer."
        textoConfirmar="Borrar"
        procesando={eliminar.isPending}
        onCancelar={() => setConfirmandoBorrado(false)}
        onConfirmar={() => {
          if (!cliente) return
          eliminar.mutate(cliente.id, {
            onSuccess: () => {
              setConfirmandoBorrado(false)
              onCerrar()
            },
            onError: (causa) => {
              setConfirmandoBorrado(false)
              setErrorGeneral(mensajeDeError(causa, 'No pudimos borrar esta ficha.'))
            },
          })
        }}
      />
    </div>
  )
}

/* ────────────────────────────── Piezas ────────────────────────────── */

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  children,
}: {
  id: string
  etiqueta: string
  error?: string
  ayuda?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p id={`${id}-ayuda`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-slate-500">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}

/**
 * El desplegable de ciudades, agrupado por departamento.
 *
 * `<optgroup>` y no una lista corrida: son 249 opciones, y sin el departamento
 * como encabezado encontrar una es leer todo. No reusa `@/components/ui/Select`
 * porque ese recibe una lista plana.
 */
function SelectCiudad({
  ciudades,
  value,
  onChange,
  invalido,
}: {
  ciudades: Ciudad[]
  value: string
  onChange: (valor: string) => void
  invalido: boolean
}) {
  const grupos = useMemo(() => {
    const porDepartamento = new Map<string, Ciudad[]>()
    for (const ciudad of ciudades) {
      const actual = porDepartamento.get(ciudad.departamento)
      if (actual) actual.push(ciudad)
      else porDepartamento.set(ciudad.departamento, [ciudad])
    }
    return [...porDepartamento.entries()]
  }, [ciudades])

  return (
    <div className="relative">
      <select
        id="ficha-ciudad"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={invalido || undefined}
        className={cn(
          'w-full appearance-none rounded-lg border-0 bg-white py-2 pr-9 pl-3 text-sm',
          'ring-1 ring-inset focus:ring-2 focus:outline-none',
          value ? 'text-slate-900' : 'text-slate-400',
          invalido ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-200 focus:ring-accent-600',
        )}
      >
        <option value="">Elegí la ciudad</option>
        {grupos.map(([departamento, lista]) => (
          <optgroup key={departamento} label={departamento}>
            {lista.map((ciudad) => (
              <option key={ciudad.id} value={String(ciudad.id)}>
                {ciudad.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

/** De dónde salió cada dato. Hechos, no campos: se leen y no se tocan. */
function Procedencia({ cliente }: { cliente: ClienteSorteoListado }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <h3 className="text-xs font-semibold text-slate-900">De dónde salieron estos datos</h3>
      <dl className="mt-2.5 space-y-2 text-xs">
        <Dato etiqueta="Nombre">
          {cliente.nombre_verificado ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <BadgeCheck className="size-3.5" aria-hidden />
              De sus facturas
            </span>
          ) : (
            'Lo escribió una persona'
          )}
        </Dato>
        <Dato etiqueta="Celular">
          {cliente.telefono_verificado ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <BadgeCheck className="size-3.5" aria-hidden />
              Verificado por SMS
            </span>
          ) : (
            'Sin verificar'
          )}
        </Dato>
        <Dato etiqueta="Campaña">{cliente.origen ?? 'Sin origen'}</Dato>
        <Dato etiqueta="Consintió">
          {formatDateTime(cliente.consentimiento_en)} · {cliente.politica_version}
        </Dato>
        <Dato etiqueta="Última edición">{formatDateTime(cliente.actualizado_en)}</Dato>
      </dl>
    </div>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-slate-800">{children}</dd>
    </div>
  )
}

/**
 * Qué había antes de cada sobrescritura.
 *
 * Existe por el escenario de la decisión 6 del schema: alguien reclama que no le
 * llegó el aviso del sorteo y hay que poder ver a qué número se le escribió.
 */
function Historial({
  cambios,
  cargando,
  ciudades,
}: {
  cambios: { id: number; nombre: string; telefono: string; ciudad_id: number; reemplazado_en: string }[]
  cargando: boolean
  ciudades: Ciudad[]
}) {
  const nombreDeCiudad = useMemo(() => {
    const porId = new Map(ciudades.map((c) => [c.id, c.nombre]))
    return (id: number) => porId.get(id) ?? `Ciudad ${String(id)}`
  }, [ciudades])

  if (cargando) return <SkeletonRows rows={2} className="border-t border-slate-100 p-5" />
  if (cambios.length === 0) return null

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
        <History className="size-3.5 text-slate-400" aria-hidden />
        Qué decía antes
      </h3>
      <ol className="mt-2.5 space-y-2.5">
        {cambios.map((cambio) => (
          <li key={cambio.id} className="text-xs">
            <p className="text-slate-400 tabular-nums">
              Hasta el {formatDateTime(cambio.reemplazado_en)}
            </p>
            <p className="text-slate-700">{cambio.nombre}</p>
            <p className="text-slate-500 tabular-nums">
              {formatearTelefono(cambio.telefono)} · {nombreDeCiudad(cambio.ciudad_id)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
