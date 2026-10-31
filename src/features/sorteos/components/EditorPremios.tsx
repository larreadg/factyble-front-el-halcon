import { ChevronDown, ChevronUp, Gift, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  descartarImagenPremio,
  urlDeImagen,
  useActualizarPremio,
  useCrearPremio,
  useEliminarPremio,
  useReordenarPremios,
} from '@/features/sorteos/api'
import { mensajeDeError } from '@/features/sorteos/errores'
import {
  FormularioPremio,
  type PremioGuardado,
} from '@/features/sorteos/components/FormularioPremio'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber, pluralize } from '@/lib/format'
import type { SorteoMarca, SorteoPremio } from '@/types/database'

/**
 * La lista de premios de un sorteo.
 *
 * ── Cada premio se guarda solo ──────────────────────────────────────────────
 * No hay un "guardar premios" al final. Agregar, editar, reordenar y borrar son
 * operaciones independientes que escriben en el momento, porque el sorteo ya
 * existe como borrador. La alternativa —mantener la lista en memoria y mandarla
 * entera— obligaría a diffear contra el servidor y a decidir qué hacer cuando la
 * mitad de las filas entra y la otra no.
 *
 * ── El orden ────────────────────────────────────────────────────────────────
 * `orden` es el puesto: 1 es el primer premio. Mover un premio va por la RPC
 * `sorteo_premios_reordenar`, que reasigna todo el bloque en una transacción —
 * desde el cliente, permutar dos órdenes choca contra el UNIQUE de la tabla.
 */
export function EditorPremios({
  sorteoId,
  premios,
  marcas,
  soloLectura = false,
}: {
  sorteoId: string
  premios: SorteoPremio[]
  marcas: SorteoMarca[]
  /** Un sorteo ya publicado muestra sus premios; no los edita. */
  soloLectura?: boolean
}) {
  const crear = useCrearPremio()
  const actualizar = useActualizarPremio()
  const eliminar = useEliminarPremio()
  const reordenar = useReordenarPremios()

  const [editando, setEditando] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [porEliminar, setPorEliminar] = useState<SorteoPremio | null>(null)

  const errorMutacion = crear.error ?? actualizar.error ?? eliminar.error ?? reordenar.error

  function guardarNuevo(valores: PremioGuardado) {
    // El orden es el siguiente puesto libre. No se recalcula la lista: agregar un
    // premio al final no tiene por qué tocar los que ya estaban.
    const orden = premios.reduce((maximo, premio) => Math.max(maximo, premio.orden), 0) + 1
    crear.mutate(
      { sorteo_id: sorteoId, orden, ...valores },
      { onSuccess: () => setAgregando(false) },
    )
  }

  function guardarEdicion(
    premio: SorteoPremio,
    valores: PremioGuardado,
    imagenAnterior: string | null,
  ) {
    actualizar.mutate(
      { id: premio.id, cambios: valores },
      {
        onSuccess: () => {
          setEditando(null)
          // Recién ahora: el archivo viejo se descarta cuando la fila nueva ya está.
          void descartarImagenPremio(imagenAnterior)
        },
      },
    )
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    const ids = premios.map((premio) => premio.id)
    const actual = ids[indice]
    const vecino = ids[destino]
    if (!actual || !vecino) return
    ids[indice] = vecino
    ids[destino] = actual
    reordenar.mutate({ sorteoId, ids })
  }

  const totalUnidades = premios.reduce((suma, premio) => suma + premio.cantidad, 0)
  const valorTotal = premios.reduce(
    (suma, premio) => suma + Number(premio.valor_estimado ?? 0) * premio.cantidad,
    0,
  )

  return (
    <div className="space-y-3">
      {premios.length === 0 && !agregando ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-600 ring-1 ring-slate-200 ring-inset">
          <Gift className="mt-px size-3.5 shrink-0 text-slate-400" aria-hidden />
          <p>
            {soloLectura
              ? 'Este sorteo no tiene premios cargados.'
              : 'Todavía no hay premios. El sorteo no se puede publicar sin al menos uno; el primero de la lista es el primer premio.'}
          </p>
        </div>
      ) : null}

      {premios.length > 0 ? (
        <ol className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200 ring-inset">
          {premios.map((premio, indice) => (
            <li key={premio.id} className={cn(editando === premio.id && 'bg-slate-50/60')}>
              {editando === premio.id ? (
                <div className="p-2.5">
                  <FormularioPremio
                    sorteoId={sorteoId}
                    premio={premio}
                    marcas={marcas}
                    guardando={actualizar.isPending}
                    onCancelar={() => setEditando(null)}
                    onGuardar={(valores, anterior) => guardarEdicion(premio, valores, anterior)}
                  />
                </div>
              ) : (
                <FilaPremio
                  premio={premio}
                  posicion={indice + 1}
                  marcas={marcas}
                  primero={indice === 0}
                  ultimo={indice === premios.length - 1}
                  ocupado={reordenar.isPending || eliminar.isPending}
                  soloLectura={soloLectura}
                  onEditar={() => {
                    setAgregando(false)
                    setEditando(premio.id)
                  }}
                  onEliminar={() => setPorEliminar(premio)}
                  onSubir={() => mover(indice, -1)}
                  onBajar={() => mover(indice, 1)}
                />
              )}
            </li>
          ))}
        </ol>
      ) : null}

      {premios.length > 1 ? (
        <p className="text-xs text-slate-500 tabular-nums">
          {formatNumber(premios.length)} {pluralize(premios.length, 'premio', 'premios')} ·{' '}
          {formatNumber(totalUnidades)} {pluralize(totalUnidades, 'unidad', 'unidades')}
          {valorTotal > 0 ? ` · ${formatCurrency(valorTotal)} en juego` : ''}
        </p>
      ) : null}

      {soloLectura ? null : agregando ? (
        <FormularioPremio
          sorteoId={sorteoId}
          marcas={marcas}
          guardando={crear.isPending}
          onCancelar={() => setAgregando(false)}
          onGuardar={guardarNuevo}
        />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditando(null)
            setAgregando(true)
          }}
        >
          <Plus className="size-3.5" aria-hidden />
          Agregar premio
        </Button>
      )}

      {errorMutacion ? (
        <p className="text-xs text-red-600">{mensajeDeError(errorMutacion)}</p>
      ) : null}

      <ConfirmDialog
        abierto={porEliminar !== null}
        titulo="Eliminar premio"
        descripcion={
          <>
            Se va a borrar <strong className="font-semibold">{porEliminar?.nombre}</strong> y su
            imagen. Los premios que siguen mantienen su orden.
          </>
        }
        textoConfirmar="Eliminar premio"
        procesando={eliminar.isPending}
        onCancelar={() => setPorEliminar(null)}
        onConfirmar={() => {
          if (!porEliminar) return
          eliminar.mutate(porEliminar, { onSuccess: () => setPorEliminar(null) })
        }}
      />
    </div>
  )
}

function FilaPremio({
  premio,
  posicion,
  marcas,
  primero,
  ultimo,
  ocupado,
  soloLectura,
  onEditar,
  onEliminar,
  onSubir,
  onBajar,
}: {
  premio: SorteoPremio
  posicion: number
  marcas: SorteoMarca[]
  primero: boolean
  ultimo: boolean
  ocupado: boolean
  soloLectura: boolean
  onEditar: () => void
  onEliminar: () => void
  onSubir: () => void
  onBajar: () => void
}) {
  const url = urlDeImagen(premio.imagen_path)
  const marca = marcas.find((candidata) => candidata.marca_codigo === premio.marca_codigo)
  const valor = Number(premio.valor_estimado ?? 0)

  return (
    <div className="flex items-start gap-3 px-3 py-3">
      {/* El número es el puesto del premio, no una viñeta: 1 es el primer premio. */}
      <span className="mt-1 w-4 shrink-0 text-right text-xs font-semibold text-slate-400 tabular-nums">
        {posicion}
      </span>

      <div className="size-12 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 ring-inset">
        {url ? (
          /* ⚠️ SIN `loading="lazy"`, y es a propósito: con el atributo puesto,
             esta miniatura NO CARGABA NUNCA. El shell de la app es `fixed
             inset-0` y `index.css` pone `overflow: hidden` en html y body, así
             que el documento no scrollea y el scroller real es un `<main>`
             anidado. El lazy loading nativo decide contra el scroller, y con el
             documento quieto nunca marca la imagen como "cerca del viewport":
             la petición no se dispara jamás y queda un recuadro vacío.
             Comprobado — el mismo elemento, sin el atributo, carga al instante.
             Son miniaturas de 48 px de un puñado de premios: no había nada que
             diferir. */
          <img src={url} alt="" decoding="async" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center" title="Sin imagen">
            <ImageOff className="size-4 text-slate-300" aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {premio.nombre}
          {premio.cantidad > 1 ? (
            <span className="ml-1.5 text-xs font-normal text-slate-500 tabular-nums">
              ×{premio.cantidad}
            </span>
          ) : null}
        </p>
        {premio.descripcion ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{premio.descripcion}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
          {marca ? <span className="text-brand-800">{marca.marca_nombre}</span> : null}
          {valor > 0 ? <span className="tabular-nums">{formatCurrency(valor)}</span> : null}
        </div>
      </div>

      {soloLectura ? null : (
        <div className="flex shrink-0 items-center gap-0.5">
          <BotonIcono
            etiqueta={`Subir ${premio.nombre}`}
            onClick={onSubir}
            disabled={primero || ocupado}
          >
            <ChevronUp className="size-4" aria-hidden />
          </BotonIcono>
          <BotonIcono
            etiqueta={`Bajar ${premio.nombre}`}
            onClick={onBajar}
            disabled={ultimo || ocupado}
          >
            <ChevronDown className="size-4" aria-hidden />
          </BotonIcono>
          <BotonIcono etiqueta={`Editar ${premio.nombre}`} onClick={onEditar} disabled={ocupado}>
            <Pencil className="size-3.5" aria-hidden />
          </BotonIcono>
          <BotonIcono
            etiqueta={`Eliminar ${premio.nombre}`}
            onClick={onEliminar}
            disabled={ocupado}
            peligroso
          >
            <Trash2 className="size-3.5" aria-hidden />
          </BotonIcono>
        </div>
      )}
    </div>
  )
}

function BotonIcono({
  etiqueta,
  onClick,
  disabled,
  peligroso = false,
  children,
}: {
  etiqueta: string
  onClick: () => void
  disabled?: boolean
  peligroso?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-600',
        'disabled:pointer-events-none disabled:opacity-30',
        peligroso
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  )
}
