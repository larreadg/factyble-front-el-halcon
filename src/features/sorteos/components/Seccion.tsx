import { Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type EstadoSeccion = 'pendiente' | 'completa' | 'bloqueada'

/**
 * Una de las tres partes de un sorteo, con su número al costado.
 *
 * ── Por qué acá los números SÍ significan algo ──────────────────────────────
 * Numerar secciones "porque se ve ordenado" es andamiaje decorativo. Acá el
 * número es información: el orden no es una sugerencia de lectura, es una
 * dependencia real. La base no acepta marcas ni premios de un sorteo que todavía
 * no existe, así que el paso 1 tiene que terminar antes de que el 2 y el 3 sean
 * posibles. El marcador lo dice, y cambia de forma según el paso esté pendiente,
 * resuelto o bloqueado.
 *
 * Las secciones van dentro de una sola tarjeta, separadas por una línea, y no una
 * tarjeta por sección: son partes de un mismo objeto, no tres objetos.
 */
export function Seccion({
  numero,
  titulo,
  descripcion,
  estado = 'pendiente',
  accion,
  children,
}: {
  numero: number
  titulo: string
  descripcion: string
  estado?: EstadoSeccion
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="px-4 py-5 sm:px-5">
      <div className="flex items-start gap-3">
        <Marcador numero={numero} estado={estado} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
            </div>
            {accion}
          </div>
        </div>
      </div>

      {/* El contenido se alinea con el título, no con el marcador: la sangría es
          lo que hace legible la jerarquía cuando hay tres secciones seguidas. */}
      <div className="mt-4 sm:pl-10">{children}</div>
    </section>
  )
}

function Marcador({ numero, estado }: { numero: number; estado: EstadoSeccion }) {
  const completa = estado === 'completa'
  const bloqueada = estado === 'bloqueada'

  return (
    <span
      className={cn(
        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
        'transition-colors duration-200',
        completa && 'bg-accent-600 text-white',
        bloqueada && 'bg-slate-100 text-slate-400 ring-1 ring-slate-200 ring-inset',
        !completa && !bloqueada && 'bg-white text-slate-500 ring-1 ring-slate-300 ring-inset',
      )}
      aria-hidden
    >
      {completa ? <Check className="size-4" /> : bloqueada ? <Lock className="size-3.5" /> : numero}
    </span>
  )
}

/**
 * Aviso de que una sección está bloqueada, con el motivo y la salida.
 * No es un error: es el estado normal de un sorteo ya publicado.
 */
export function SeccionBloqueada({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-600 ring-1 ring-slate-200 ring-inset">
      <Lock className="mt-px size-3.5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
