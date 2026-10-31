import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { useEnmascararGanadores } from '@/features/sorteos/apiEjecucion'
import { mensajeDeError } from '@/features/sorteos/errores'
import { enmascararNombre } from '@/features/sorteos/mascara'
import { cn } from '@/lib/cn'
import type { Sorteo } from '@/types/database'

/**
 * Si el nombre del ganador se muestra completo o recortado.
 *
 * ── Por qué es una decisión del sorteo y no una preferencia de pantalla ──────
 * Afecta a los dos lugares donde un tercero ve el nombre: la pantalla de
 * presentación —que se graba y se sube a redes— y la página pública de
 * resultados. Si viviera en el navegador, quien graba podría tenerlo apagado sin
 * saberlo y publicar el nombre completo de un cliente en una historia. Vive en la
 * fila del sorteo, se decide antes de sortear, y la base la respeta en las dos
 * puntas.
 *
 * ── Por qué se guarda solo ─────────────────────────────────────────────────
 * Es el único campo de la configuración que un sorteo YA SORTEADO sigue
 * admitiendo (junto con publicar la página). Meterlo en el formulario de
 * definición lo haría viajar con el resto de las columnas, y el trigger rechaza
 * ese UPDATE entero en cuanto el sorteo está sorteado. Así que es un control
 * aparte, que manda una sola columna y funciona en cualquier estado.
 */

/** Un nombre de muestra para que se vea el efecto sin exponer a nadie real. */
const EJEMPLO = 'JORGE OSVALDO BENÍTEZ'

export function SwitchEnmascarar({ sorteo }: { sorteo: Sorteo }) {
  const guardar = useEnmascararGanadores()
  const [error, setError] = useState<string | null>(null)

  const enmascarado = sorteo.enmascarar_ganadores
  const muestra = enmascarado ? enmascararNombre(EJEMPLO) : EJEMPLO

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200 ring-inset">
        {enmascarado ? (
          <EyeOff className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <Eye className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <label
            htmlFor="sorteo-enmascarar"
            className="text-xs font-medium text-slate-900 sm:text-sm"
          >
            Enmascarar nombres de ganadores
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            {enmascarado
              ? 'En la pantalla que se graba y en la página pública se lee '
              : 'Se muestra el nombre completo: '}
            {/* Sin punto después: el nombre enmascarado YA termina en punto, y dos
                seguidos se leen como un error de tipeo. */}
            <span className="font-medium text-slate-700">{muestra}</span>
            {enmascarado ? '' : '. Conviene sólo si el ganador autorizó que se lo nombre.'}
          </p>
        </div>

        {/* `role="switch"` y no un checkbox estilado: lo que hace no es marcar una
            casilla de un formulario que después se envía, es cambiar un ajuste
            que se guarda al toque. */}
        <button
          type="button"
          id="sorteo-enmascarar"
          role="switch"
          aria-checked={enmascarado}
          disabled={guardar.isPending}
          onClick={() => {
            setError(null)
            guardar.mutate(
              { id: Number(sorteo.id), valor: !enmascarado },
              { onError: (causa) => setError(mensajeDeError(causa, 'No pudimos guardarlo.')) },
            )
          }}
          className={cn(
            'mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
            'disabled:opacity-60',
            enmascarado ? 'bg-accent-600' : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              enmascarado ? 'translate-x-4' : 'translate-x-0',
            )}
            aria-hidden
          />
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
