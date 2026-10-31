import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/**
 * Confirmación de una acción que no se puede deshacer.
 *
 * ── Por qué un modal acá, cuando un modal casi siempre es pereza ────────────
 * Porque la acción es destructiva e irreversible, y lo único que hace un modal
 * mejor que cualquier alternativa en línea es *impedir seguir* hasta que la
 * persona decida. Para todo lo demás —editar, elegir, agregar— esta pantalla
 * resuelve en la página.
 *
 * ── Por qué `<dialog>` nativo y no un div con z-index ──────────────────────
 * El navegador se encarga de las tres cosas que a mano se hacen mal: lo pone en la
 * top layer (no lo recorta ningún `overflow: hidden` de un ancestro, y no hay que
 * inventar un z-index), atrapa el foco, y cierra con Esc. Lo único que agregamos
 * es que Esc y el clic en el velo cuenten como "cancelar".
 */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  detalle,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  destructivo = true,
  procesando = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  descripcion: ReactNode
  /** Consecuencia concreta, cuando hay una que conviene enumerar. */
  detalle?: ReactNode
  textoConfirmar?: string
  textoCancelar?: string
  destructivo?: boolean
  procesando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      // El `cancel` nativo (Esc) cierra sin avisar a React: lo interceptamos para
      // que el estado del padre no quede creyendo que el diálogo sigue abierto.
      onCancel={(evento) => {
        evento.preventDefault()
        if (!procesando) onCancelar()
      }}
      onClick={(evento) => {
        // El clic en el velo llega al propio <dialog>; el de adentro, a un hijo.
        if (evento.target === dialogo.current && !procesando) onCancelar()
      }}
      aria-labelledby="confirm-titulo"
      className={cn(
        'm-auto w-[calc(100vw-2rem)] max-w-md rounded-xl bg-white p-0 text-slate-900 shadow-xl',
        'backdrop:bg-ink-950/50 backdrop:backdrop-blur-[1px]',
        'open:animate-entrada-suave',
      )}
    >
      <div className="flex gap-3.5 p-5">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            destructivo ? 'bg-red-50 text-red-600' : 'bg-accent-50 text-accent-700',
          )}
        >
          <AlertTriangle className="size-4.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 id="confirm-titulo" className="text-sm font-semibold text-slate-900">
            {titulo}
          </h2>
          <div className="mt-1 text-sm text-slate-600">{descripcion}</div>
          {detalle ? <div className="mt-2.5 text-xs text-slate-500">{detalle}</div> : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 rounded-b-xl bg-slate-50 px-5 py-3.5">
        <Button variant="secondary" size="sm" onClick={onCancelar} disabled={procesando}>
          {textoCancelar}
        </Button>
        <Button
          variant={destructivo ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirmar}
          loading={procesando}
        >
          {textoConfirmar}
        </Button>
      </div>
    </dialog>
  )
}
