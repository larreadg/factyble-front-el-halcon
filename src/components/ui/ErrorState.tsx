import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function ErrorState({
  title = 'No pudimos cargar los datos',
  description,
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden />
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
