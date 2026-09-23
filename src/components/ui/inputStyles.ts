import { cn } from '@/lib/cn'

/** Estilos base de los campos de texto, compartidos por `Input` y los campos con ícono. */
export const inputBaseClass = cn(
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900',
  'ring-1 ring-slate-200 ring-inset placeholder:text-slate-400',
  'focus:ring-2 focus:ring-accent-600 focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
)
