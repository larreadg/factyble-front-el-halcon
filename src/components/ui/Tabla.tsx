import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import { cn } from '@/lib/cn'

/**
 * Las piezas de los listados del panel: facturas, sorteos y padrón.
 *
 * ── Por qué existe este archivo ────────────────────────────────────────────
 * Los tres listados nacieron por separado y terminaron pareciéndose sin ser
 * iguales: dos anchos mínimos distintos, dos copias literales del encabezado
 * ordenable, tres anchos para la columna de acciones, tres formas de armar la
 * tarjeta de celular —una con el botón en posición absoluta encima—. Nada de eso
 * era una decisión; era deriva. Cuando el padding de una celda vive en tres
 * archivos, el cuarto listado nace con un cuarto padding.
 *
 * ── Primero el celular ─────────────────────────────────────────────────────
 * Por eso la lista está ARRIBA en este archivo y la tabla abajo: ese es el orden
 * en que se decide. La lista es la vista base —la que sale sin ningún prefijo de
 * breakpoint— y la tabla es lo que se gana recién en `lg`, cuando hay ancho para
 * seis o nueve columnas. No es una tabla que se degrada: es una lista que, si
 * hay lugar, se abre en columnas.
 *
 * Eso decide cosas concretas: el control de cada fila mide 40px de alto en el
 * celular y se compacta a 32 en escritorio, no al revés; el título de la tarjeta
 * usa dos renglones antes que truncar, porque en un celular el nombre es lo
 * único por lo que se reconoce una fila y cortarlo la vuelve anónima.
 *
 * ── El patrón de fila ──────────────────────────────────────────────────────
 * Toda fila termina en una acción explícita: «Ver detalle», «Abrir», «Ver
 * ficha». No es la fila entera la que se puede tocar. Con una fila clickeable
 * hay que detener la propagación de cada control interno, agregarle manejo de
 * teclado a un `<tr>` que no lo tiene, y en un celular nunca se sabe del todo
 * qué parte responde. Un control con nombre dice qué va a pasar, es una sola
 * parada de teclado y se lee igual en las tres pantallas.
 */

/* ══════════════════════════ La vista base: la lista ══════════════════════ */

export function ListaMovil({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-slate-100 lg:hidden">{children}</ul>
}

/**
 * Una fila en pantalla chica.
 *
 * La forma es la misma en las tres pantallas: arriba lo que identifica la fila
 * —con un dato de cierre a la derecha, si lo hay—, abajo los metadatos en una
 * línea que se envuelve, y la acción cerrando esa última línea, pegada al borde
 * derecho, que es donde cae el pulgar.
 */
export function ItemMovil({
  titulo,
  subtitulo,
  derecha,
  meta,
  accion,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** El dato de cierre arriba a la derecha: un total, un estado. */
  derecha?: ReactNode
  meta?: ReactNode
  accion?: ReactNode
}) {
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Dos renglones antes que truncar: «GRUPO F27 SOCIEDAD ANONIMA» y
              «GRUPO F27 SOCIEDAD…» no son lo mismo cuando es lo único que
              distingue una fila de la siguiente. */}
          <div className="line-clamp-2 text-sm font-medium text-slate-900">{titulo}</div>
          {subtitulo ? <div className="mt-0.5 min-w-0 text-sm">{subtitulo}</div> : null}
        </div>
        {derecha ? <div className="shrink-0 text-right">{derecha}</div> : null}
      </div>

      {meta || accion ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          {meta}
          {accion ? <div className="ml-auto flex items-center gap-1">{accion}</div> : null}
        </div>
      ) : null}
    </li>
  )
}

/* ══════════════════════ La acción, en las dos vistas ═════════════════════ */

interface AccionBase {
  /** Qué se está abriendo, para el lector de pantalla: «de la factura 001-…». */
  sobre?: string
  children: ReactNode
}

/**
 * El control que abre lo que la fila representa.
 *
 * `h-10` en el celular y `h-8` en escritorio: el alto de toque cómodo primero, y
 * la densidad después, cuando hay mouse. Va en `<Link>` cuando navega y en
 * `<button>` cuando abre un panel —la diferencia importa (click medio, copiar
 * enlace, historial) y no se puede decidir desde acá—, pero las dos se ven
 * exactamente igual.
 */
export function AccionFila({ to, sobre, children }: AccionBase & { to: string }) {
  return (
    <Link to={to} className={CLASE_ACCION}>
      {children}
      {sobre ? <span className="sr-only"> {sobre}</span> : null}
      <ChevronRight className="-mr-1 size-4 text-slate-400" aria-hidden />
    </Link>
  )
}

export function BotonFila({ onClick, sobre, children }: AccionBase & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={CLASE_ACCION}>
      {children}
      {sobre ? <span className="sr-only"> {sobre}</span> : null}
      <ChevronRight className="-mr-1 size-4 text-slate-400" aria-hidden />
    </button>
  )
}

const CLASE_ACCION = buttonClass({
  variant: 'ghost',
  size: 'sm',
  className: 'h-10 shrink-0 lg:h-8',
})

/* ═══════════════════ Lo que se gana en `lg`: la tabla ════════════════════ */

/**
 * Anchos mínimos. Son dos y no seis a propósito: el ancho lo manda la cantidad
 * de columnas, y nuestros listados son de cinco a seis columnas, o de nueve.
 */
const ANCHOS = {
  media: 'min-w-[56rem]',
  ancha: 'min-w-[60rem]',
} as const

export function Tabla({
  ancho = 'media',
  children,
}: {
  ancho?: keyof typeof ANCHOS
  children: ReactNode
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className={cn('w-full text-sm', ANCHOS[ancho])}>{children}</table>
    </div>
  )
}

export function Cabecera({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
      <tr>{children}</tr>
    </thead>
  )
}

export function Cuerpo({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function Fila({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-slate-50/70">{children}</tr>
}

export function Th({
  align = 'left',
  className,
  children,
}: {
  align?: 'left' | 'right'
  className?: string
  children: ReactNode
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 font-medium',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

/**
 * La columna de acciones.
 *
 * `w-px` con el contenido en `whitespace-nowrap` es el truco de siempre para que
 * una columna ocupe exactamente lo que necesita: el navegador la achica hasta el
 * ancho de su contenido y le deja el resto a las columnas de datos. Reemplaza a
 * los tres anchos fijos que había (`w-40`, `w-28`, `w-10`), que eran tres
 * adivinanzas distintas sobre el mismo problema.
 */
export function ThAcciones({ children = 'Acciones' }: { children?: ReactNode }) {
  return (
    <th scope="col" className="w-px px-4 py-2.5">
      <span className="sr-only">{children}</span>
    </th>
  )
}

/**
 * Encabezado que ordena. Genérico en el campo, porque cada tabla ordena por lo
 * suyo y antes eso justificaba dos copias idénticas del mismo componente.
 */
export function ThOrden<C extends string>({
  campo,
  orden,
  direccion,
  onOrdenar,
  align = 'left',
  children,
}: {
  campo: C
  orden: C
  direccion: 'asc' | 'desc'
  onOrdenar: (campo: C) => void
  align?: 'left' | 'right'
  children: ReactNode
}) {
  const activo = orden === campo
  const Icono = !activo ? ArrowUpDown : direccion === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      scope="col"
      // `text-left` explícito: un `<th>` se centra por defecto, y un encabezado
      // centrado sobre una columna de datos alineados a la izquierda se lee como
      // si estuviera flotando sobre la columna equivocada. Se notaba en el
      // padrón, donde los títulos son más largos que los datos.
      className={cn('px-4 py-2.5 font-medium', align === 'right' ? 'text-right' : 'text-left')}
      aria-sort={activo ? (direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
          activo && 'text-slate-900',
          align === 'right' && 'w-full justify-end',
        )}
      >
        {children}
        <Icono
          className={cn('size-3.5', activo ? 'text-accent-600' : 'text-slate-400')}
          aria-hidden
        />
      </button>
    </th>
  )
}

/**
 * El tono dice qué peso tiene el dato en la fila, no de qué color es:
 * `principal` es aquello por lo que se reconoce la fila, `tenue` el dato de
 * contexto que no se lee salvo que se lo busque.
 */
const TONOS = {
  principal: 'font-medium text-slate-900',
  normal: 'text-slate-700',
  tenue: 'text-slate-500',
} as const

export function Td({
  align = 'left',
  tono = 'normal',
  numerica = false,
  className,
  children,
}: {
  align?: 'left' | 'right'
  tono?: keyof typeof TONOS
  /** Números: alineados por dígito y sin cortar en dos renglones. */
  numerica?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <td
      className={cn(
        'px-4 py-3',
        align === 'right' && 'text-right',
        TONOS[tono],
        numerica && 'whitespace-nowrap tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** La celda de acciones: siempre a la derecha, siempre en una línea. */
export function TdAcciones({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center justify-end gap-1 whitespace-nowrap">{children}</div>
    </td>
  )
}

/** El pie de totales, cuando el listado suma algo. Hoy sólo facturas. */
export function Pie({ children }: { children: ReactNode }) {
  return (
    <tfoot className="border-t border-slate-200 bg-slate-50 text-xs">
      <tr>{children}</tr>
    </tfoot>
  )
}
