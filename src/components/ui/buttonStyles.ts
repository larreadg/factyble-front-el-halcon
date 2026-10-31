import { cn } from '@/lib/cn'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 focus-visible:outline-accent-600',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-50 focus-visible:outline-accent-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-accent-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
}

/**
 * Las clases de un botón, sin el `<button>`. Mismo motivo que `inputStyles`: es lo
 * compartido entre el componente y los elementos que tienen que verse igual sin
 * ser un `<button>`.
 *
 * El caso concreto es un `<Link>` que cumple el rol de acción principal. Tiene que
 * seguir siendo un `<a>` —click medio, abrir en pestaña nueva, copiar el enlace— y
 * anidar un `<Link>` dentro de un `<button>` además es HTML inválido. Sin esto,
 * habría dos definiciones de "cómo es un botón acá", que es como empiezan a
 * divergir.
 */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant
  size?: Size
  className?: string
} = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
