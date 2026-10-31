import { List, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { formatCurrency, formatNumber } from '@/lib/format'
import type { SorteoParticipante } from '@/types/database'

/**
 * La lista completa del bolillero, recorrible antes de sortear.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 * Es lo que separa una grabación creíble de un número que sale de la nada. Quien
 * mira el video tiene que poder ver el bolillero ANTES del giro: cuántas
 * facturas hay y cuáles son. Es la práctica estándar de los sorteadores serios y
 * cuesta un botón.
 *
 * Sale de la misma función que sortea, así que lo que se muestra acá es
 * literalmente sobre lo que se va a sortear — no una consulta parecida.
 *
 * ── Por qué muestra el número de factura y no el nombre ────────────────────
 * Porque la unidad es la factura. Y porque proyectar 900 nombres de clientes
 * para grabarlos es exponer datos de gente que no vino a eso: el nombre del
 * ganador se muestra al final, que es lo único que hace falta.
 */

export function ListaParticipantes({ participantes }: { participantes: SorteoParticipante[] }) {
  const [abierta, setAbierta] = useState(false)
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierta && !elemento.open) elemento.showModal()
    if (!abierta && elemento.open) elemento.close()
  }, [abierta])

  if (participantes.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <List className="size-3.5" aria-hidden />
        Ver el bolillero
      </button>

      <dialog
        ref={dialogo}
        onCancel={(evento) => {
          evento.preventDefault()
          setAbierta(false)
        }}
        onClick={(evento) => {
          if (evento.target === dialogo.current) setAbierta(false)
        }}
        aria-labelledby="bolillero-titulo"
        // ⚠️ SIN utilidades de `display` acá. Un `<dialog>` cerrado es
        // `display: none` por el estilo del navegador, y poner `flex` en el
        // propio elemento lo pisa: el diálogo queda VISIBLE siempre, abierto o
        // no. El layout va en el `<div>` de adentro.
        className="m-auto max-h-[80vh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-ink-950/60 open:animate-entrada-suave"
      >
        <div className="flex max-h-[80vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id="bolillero-titulo" className="text-sm font-semibold text-slate-900">
                El bolillero
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatNumber(participantes.length)} facturas participan de este sorteo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAbierta(false)}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <ol className="scrollbar-thin flex-1 divide-y divide-slate-100 overflow-y-auto">
            {participantes.map((p, indice) => (
              <li key={p.factura_id} className="flex items-baseline gap-3 px-5 py-2 text-sm">
                <span className="w-10 shrink-0 text-right text-xs text-slate-400 tabular-nums">
                  {indice + 1}
                </span>
                <span className="flex-1 font-medium text-slate-900 tabular-nums">
                  {p.factura_numero}
                </span>
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {formatCurrency(p.monto_marcas)}
                </span>
              </li>
            ))}
          </ol>

          <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            El orden es el del sorteo: por número interno de factura. La posición que salga queda
            escrita en el acta.
          </p>
        </div>
      </dialog>
    </>
  )
}
