import { useEffect, useRef } from 'react'

/**
 * Los atajos, en pantalla.
 *
 * Existe porque esta pantalla se opera SIN mouse: quien graba tiene una mano en
 * el teclado y la cámara encima. Un atajo que no se puede consultar es un atajo
 * que no se usa.
 */

const ATAJOS: [string, string][] = [
  ['Espacio', 'Sortear el premio actual, o pasar al siguiente'],
  ['Enter', 'Lo mismo que Espacio'],
  ['F', 'Pantalla completa'],
  ['H', 'Modo limpio: esconde todos los controles'],
  ['M', 'Sonido'],
  ['?', 'Esta ayuda'],
  ['Esc', 'Cerrar'],
]

export function AyudaAtajos({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierta && !elemento.open) elemento.showModal()
    if (!abierta && elemento.open) elemento.close()
  }, [abierta])

  return (
    <dialog
      ref={dialogo}
      onCancel={(evento) => {
        evento.preventDefault()
        onCerrar()
      }}
      onClick={(evento) => {
        if (evento.target === dialogo.current) onCerrar()
      }}
      aria-labelledby="atajos-titulo"
      // Sin utilidades de `display`: un <dialog> cerrado es `display: none` por
      // el estilo del navegador, y `flex` acá lo dejaría visible siempre.
      className="m-auto w-[calc(100vw-3rem)] max-w-md rounded-2xl bg-ink-900 p-0 text-white shadow-2xl backdrop:bg-black/70 open:animate-entrada-suave"
    >
      <div className="p-6">
        <h2 id="atajos-titulo" className="text-sm font-semibold text-white">
          Atajos de teclado
        </h2>
        <p className="mt-1 text-xs text-white/40">
          Pensados para sortear sin tocar el mouse mientras se graba.
        </p>
        <dl className="mt-5 space-y-2.5">
          {ATAJOS.map(([tecla, que]) => (
            <div key={tecla} className="flex items-baseline gap-3">
              <dt className="w-20 shrink-0">
                <kbd className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/80">
                  {tecla}
                </kbd>
              </dt>
              <dd className="text-sm text-white/60">{que}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          Entendido
        </button>
      </div>
    </dialog>
  )
}
