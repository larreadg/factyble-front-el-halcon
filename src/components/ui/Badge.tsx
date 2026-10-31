import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { CondicionVenta, EstadoSifen } from '@/types/database'

export type Tone = 'verde' | 'rojo' | 'azul' | 'celeste' | 'neutro' | 'ambar'

const TONES: Record<Tone, string> = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rojo: 'bg-red-50 text-red-700 ring-red-600/20',
  azul: 'bg-accent-50 text-accent-800 ring-accent-600/20',
  celeste: 'bg-brand-50 text-brand-800 ring-brand-600/20',
  neutro: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-600/20',
}

export function Badge({
  tone = 'neutro',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EstadoBadge({ estado }: { estado: EstadoSifen }) {
  return (
    <Badge tone={estado === 'APROBADO' ? 'verde' : 'rojo'}>
      {estado === 'APROBADO' ? 'Aprobado' : 'Cancelado'}
    </Badge>
  )
}

export function CondicionBadge({ condicion }: { condicion: CondicionVenta | null }) {
  if (!condicion) return <span className="text-slate-400">—</span>
  return (
    <Badge tone={condicion === 'CONTADO' ? 'celeste' : 'azul'}>
      {condicion === 'CONTADO' ? 'Contado' : 'Crédito'}
    </Badge>
  )
}
