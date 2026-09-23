import type { ReactNode } from 'react'

import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'

interface BloqueProps {
  title: string
  description?: string
  action?: ReactNode
  isPending: boolean
  isError: boolean
  /** Opcional: permite explicar errores que el usuario puede resolver. */
  error?: unknown
  vacio?: boolean
  mensajeVacio?: string
  onRetry?: () => void
  skeleton: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Si falta la función en la base, PostgREST responde `PGRST202`. Decirlo es más
 * útil que "no pudimos cargar los datos": es algo que se arregla en Supabase.
 */
function describirError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const { code } = error as { code?: unknown }
  if (code === 'PGRST202') {
    return 'Falta crear la función en la base. Aplicá supabase/schema.sql del backend, que es donde vive el esquema completo.'
  }
  return undefined
}

/**
 * Envoltorio común de los bloques del dashboard: una sola card que resuelve
 * cargando / error / vacío antes de mostrar el contenido.
 */
export function Bloque({
  title,
  description,
  action,
  isPending,
  isError,
  error,
  vacio = false,
  mensajeVacio = 'Sin facturas en el período',
  onRetry,
  skeleton,
  className,
  children,
}: BloqueProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={title} description={description} action={action} />
      <CardBody className="flex-1">
        {isPending ? skeleton : null}
        {!isPending && isError ? (
          <ErrorState description={describirError(error)} onRetry={onRetry} />
        ) : null}
        {!isPending && !isError && vacio ? <EmptyState title={mensajeVacio} /> : null}
        {!isPending && !isError && !vacio ? children : null}
      </CardBody>
    </Card>
  )
}
