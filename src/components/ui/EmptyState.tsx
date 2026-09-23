import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function EmptyState({
  title = 'Sin facturas en el período',
  description,
  icon,
  className,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}
