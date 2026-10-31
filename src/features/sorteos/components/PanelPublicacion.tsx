import { Check, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EstadoSorteoBadge } from '@/features/sorteos/components/EstadoSorteoBadge'
import { accionesDesde, QUE_SIGNIFICA, type AccionEstado } from '@/features/sorteos/estados'
import { mensajeDeError } from '@/features/sorteos/errores'
import { cn } from '@/lib/cn'
import { formatDate, formatFechaCalendario } from '@/lib/dates'
import type { EstadoSorteo, Sorteo } from '@/types/database'

/**
 * El panel de publicación: en qué estado está el sorteo, qué le falta para poder
 * publicarse y qué se puede hacer con él.
 *
 * ── Los requisitos son los de la base, escritos donde se ven ────────────────
 * "Al menos una marca" y "al menos un premio" no son reglas de este formulario:
 * son dos invariantes que un trigger de PostgreSQL hace cumplir, y que rechazarían
 * el cambio de estado con un error. Mostrarlas como una lista que se va tildando
 * convierte ese rechazo futuro en una instrucción presente — y es la razón por la
 * que el botón de publicar puede estar deshabilitado con un motivo a la vista, en
 * vez de fallar después del click.
 */
export function PanelPublicacion({
  sorteo,
  cantidadMarcas,
  cantidadPremios,
  cambiando,
  eliminando,
  error,
  onCambiarEstado,
  onEliminar,
}: {
  sorteo: Sorteo
  cantidadMarcas: number
  cantidadPremios: number
  cambiando: boolean
  eliminando: boolean
  error: unknown
  onCambiarEstado: (destino: EstadoSorteo) => void
  onEliminar: () => void
}) {
  const [aConfirmar, setAConfirmar] = useState<AccionEstado | null>(null)
  const [borrando, setBorrando] = useState(false)

  const acciones = accionesDesde(sorteo.estado)
  const completo = cantidadMarcas > 0 && cantidadPremios > 0
  const esBorrador = sorteo.estado === 'BORRADOR'

  function ejecutar(accion: AccionEstado) {
    if (accion.confirmar) {
      setAConfirmar(accion)
      return
    }
    onCambiarEstado(accion.destino)
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Estado</h2>
          <EstadoSorteoBadge estado={sorteo.estado} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{QUE_SIGNIFICA[sorteo.estado]}</p>
      </div>

      {esBorrador ? (
        <div>
          <p className="text-xs font-medium text-slate-700">Para publicar</p>
          <ul className="mt-2 space-y-1.5">
            <Requisito cumplido label="Definición y período" />
            <Requisito
              cumplido={cantidadMarcas > 0}
              label={
                cantidadMarcas > 0
                  ? `${cantidadMarcas} marca${cantidadMarcas > 1 ? 's' : ''}`
                  : 'Al menos una marca'
              }
            />
            <Requisito
              cumplido={cantidadPremios > 0}
              label={
                cantidadPremios > 0
                  ? `${cantidadPremios} premio${cantidadPremios > 1 ? 's' : ''}`
                  : 'Al menos un premio'
              }
            />
          </ul>
        </div>
      ) : null}

      {acciones.length > 0 ? (
        <div className="space-y-2">
          {acciones.map((accion, indice) => (
            <Button
              key={accion.destino}
              // La primera acción de cada estado es la que el sorteo espera:
              // publicar un borrador, cerrar un abierto. Las otras son salidas.
              //
              // Con el sorteo CERRADO ninguna lo es: lo que sigue es sortearlo, y
              // ese botón vive en el panel de abajo. Reabrir el período acá en
              // azul competiría con él y se tocaría por error.
              variant={
                indice === 0 && sorteo.estado !== 'CERRADO'
                  ? 'primary'
                  : accion.destructivo
                    ? 'ghost'
                    : 'secondary'
              }
              size="sm"
              className={cn(
                'w-full',
                accion.destructivo && indice > 0 && 'text-red-600 hover:bg-red-50',
              )}
              disabled={cambiando || (accion.destino === 'ABIERTO' && esBorrador && !completo)}
              onClick={() => ejecutar(accion)}
            >
              {accion.etiqueta}
            </Button>
          ))}

          {esBorrador && !completo ? (
            <p className="text-xs text-slate-500">
              Falta {cantidadMarcas === 0 ? 'elegir una marca' : ''}
              {cantidadMarcas === 0 && cantidadPremios === 0 ? ' y ' : ''}
              {cantidadPremios === 0 ? 'cargar un premio' : ''}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Un sorteo ya sorteado no admite cambios. Es lo que permite decir, más adelante,
          exactamente qué se sorteó.
        </p>
      )}

      {error ? <p className="text-xs text-red-600">{mensajeDeError(error)}</p> : null}

      <dl className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex justify-between gap-2">
          <dt>Creado</dt>
          {/* `formatDate` y no `formatFechaCalendario`: `creado_en` es un
              timestamptz, no un día. Cortarle los primeros diez caracteres da el
              día UTC, que después de las 21:00 de Asunción ya es el de mañana —
              un sorteo creado esta tarde decía haberse creado mañana. */}
          <dd className="tabular-nums">{formatDate(sorteo.creado_en)}</dd>
        </div>
        {sorteo.fecha_sorteo ? (
          <div className="flex justify-between gap-2">
            <dt>Se sortea</dt>
            <dd className="tabular-nums">{formatFechaCalendario(sorteo.fecha_sorteo)}</dd>
          </div>
        ) : null}
      </dl>

      {esBorrador ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
          disabled={eliminando}
          onClick={() => setBorrando(true)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Eliminar borrador
        </Button>
      ) : null}

      <ConfirmDialog
        abierto={aConfirmar !== null}
        titulo={aConfirmar?.etiqueta ?? ''}
        descripcion={aConfirmar?.consecuencia ?? ''}
        textoConfirmar={aConfirmar?.etiqueta ?? 'Confirmar'}
        destructivo={aConfirmar?.destructivo ?? false}
        procesando={cambiando}
        onCancelar={() => setAConfirmar(null)}
        onConfirmar={() => {
          if (!aConfirmar) return
          onCambiarEstado(aConfirmar.destino)
          setAConfirmar(null)
        }}
      />

      <ConfirmDialog
        abierto={borrando}
        titulo="Eliminar el borrador"
        descripcion={
          <>
            Se borran <strong className="font-semibold">{sorteo.nombre}</strong>, sus marcas, sus
            premios y las imágenes que subiste. No se puede deshacer.
          </>
        }
        detalle="Sólo se puede borrar un borrador. Un sorteo publicado se cancela, para que quede el registro de que existió."
        textoConfirmar="Eliminar borrador"
        procesando={eliminando}
        onCancelar={() => setBorrando(false)}
        onConfirmar={onEliminar}
      />
    </div>
  )
}

function Requisito({ cumplido, label }: { cumplido: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
          cumplido ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
        )}
        aria-hidden
      >
        {cumplido ? <Check className="size-2.5" /> : <X className="size-2.5" />}
      </span>
      <span className={cumplido ? 'text-slate-700' : 'text-slate-500'}>{label}</span>
      <span className="sr-only">{cumplido ? '(listo)' : '(falta)'}</span>
    </li>
  )
}
