import { Check } from 'lucide-react'

import type { Paso } from '@/features/publico/estado'
import { cn } from '@/lib/cn'

/**
 * El riel de los cuatro pasos.
 *
 * ── Por qué acá los números sí van ─────────────────────────────────────────
 * Numerar secciones es normalmente decoración. Acá no: esto ES una secuencia, el
 * orden es obligatorio y la persona necesita saber cuánto le falta antes de
 * empezar a tipear su celular en una página que no conoce. El número es el dato.
 *
 * ── Por qué una `<ol>` y no cuatro `<div>` ─────────────────────────────────
 * Un lector de pantalla anuncia "lista de 4 elementos" y `aria-current="step"`
 * dice en cuál está. Con divs habría que reconstruir eso a mano, y quien navega
 * a ciegas un formulario público de cuatro pasos es justo quien más necesita
 * saber dónde está parado.
 *
 * ── Los dos anchos ─────────────────────────────────────────────────────────
 * Arriba de 260 px de riel entran las cuatro etiquetas y son útiles: se ve qué
 * viene después. Abajo de eso no entran, y truncarlas deja cuatro muñones
 * ("Celu…", "Conf…") que no dicen nada. Ahí se cae a los números más una línea
 * que nombra el paso actual, que es la única etiqueta que hace falta para saber
 * dónde estás.
 *
 * Las etiquetas son cortas ("Datos", no "Tus datos") por una razón medida: la
 * tilde del paso ya hecho ocupa más que el número que reemplaza, así que el
 * espacio por etiqueta se ACHICA a medida que se avanza.
 *
 * El corte va por CONTAINER QUERY y no por breakpoint de viewport: lo que decide
 * es cuánto mide el riel, y eso depende del ancho de la hoja, no del de la
 * pantalla.
 */

const PASOS: { numero: Paso; etiqueta: string }[] = [
  { numero: 1, etiqueta: 'Celular' },
  { numero: 2, etiqueta: 'Datos' },
  { numero: 3, etiqueta: 'Ciudad' },
  { numero: 4, etiqueta: 'Confirmar' },
]

export function RielPasos({ actual }: { actual: Paso }) {
  const etiquetaActual = PASOS.find((p) => p.numero === actual)?.etiqueta ?? ''

  return (
    <div className="@container">
      <ol className="flex gap-1.5" aria-label={`Paso ${String(actual)} de 4`}>
        {PASOS.map(({ numero, etiqueta }) => {
          const hecho = numero < actual
          const aqui = numero === actual

          return (
            <li key={numero} className="min-w-0 flex-1" aria-current={aqui ? 'step' : undefined}>
              {/* La barra lleva el estado; el texto de abajo lo nombra. Se anima
                  el color y no el ancho: un ancho animado en cuatro elementos
                  flex obliga a recalcular el layout de la fila entera. */}
              <div
                className={cn(
                  'h-1 rounded-full transition-colors duration-200',
                  hecho || aqui ? 'bg-accent-600' : 'bg-slate-200',
                )}
                aria-hidden
              />
              <div className="mt-2 flex items-center gap-1">
                {hecho ? (
                  <Check className="size-3 shrink-0 text-accent-600" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      aqui ? 'text-accent-700' : 'text-slate-400',
                    )}
                    aria-hidden
                  >
                    {numero}
                  </span>
                )}
                {/* Oculto, no ausente: el nombre del paso tiene que estar en el
                    árbol de accesibilidad en los dos anchos. Lo que cambia con el
                    ancho es si se dibuja. */}
                <span
                  className={cn(
                    'truncate text-[11px] font-medium',
                    'sr-only @[260px]:not-sr-only @[260px]:truncate',
                    hecho && 'text-slate-500',
                    aqui && 'text-slate-900',
                    !hecho && !aqui && 'text-slate-400',
                  )}
                >
                  {etiqueta}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {/* La etiqueta del paso actual, sólo cuando las cuatro no entran. Va
          `aria-hidden` porque el nombre ya lo anuncia la `<li>` con
          `aria-current`: sin esto, un lector de pantalla lo diría dos veces. */}
      <p className="mt-2 text-[11px] font-medium text-slate-900 @[260px]:hidden" aria-hidden>
        {etiquetaActual}
      </p>
    </div>
  )
}
