import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Los tres pedazos que rodean a un control: etiqueta, ayuda y error.
 *
 * Existen como componentes y no como clases repetidas porque la relación
 * `aria-describedby` → `id` es la que más fácil se rompe al copiar y pegar un
 * bloque de campo, y cuando se rompe no se nota mirando la pantalla: se nota
 * usando un lector de pantalla, o sea nunca.
 *
 * La convención es una sola: el texto que acompaña a un campo con `id="x"` vive
 * en `id="x-ayuda"`, sea ayuda o error. Así el `aria-describedby` no cambia según
 * el estado.
 */

export function Etiqueta({
  htmlFor,
  children,
  opcional,
}: {
  htmlFor: string
  children: ReactNode
  /** Marcar lo opcional, no lo obligatorio: en este formulario casi todo lo es. */
  opcional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-slate-700">
      {children}
      {opcional ? <span className="text-xs font-normal text-slate-400">opcional</span> : null}
    </label>
  )
}

export function Ayuda({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-slate-500">
      {children}
    </p>
  )
}

export function MensajeError({ id, children }: { id: string; children: ReactNode }) {
  return (
    // `role="alert"` y no `aria-live`: el mensaje aparece por una acción de la
    // persona y tiene que interrumpir, no esperar una pausa.
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

/**
 * El aviso que no es de ningún campo: se cayó la red, venció la verificación,
 * se agotó un tope.
 *
 * Va en un recuadro con borde completo y fondo tenue. No con una franja de
 * color a la izquierda: eso pide leer el color para entender la jerarquía, y en
 * un formulario que se llena a la apurada en un mostrador el mensaje tiene que
 * verse como un bloque, no como un adorno.
 */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
