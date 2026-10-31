import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Etiqueta + control + una sola línea de ayuda debajo.
 *
 * El error REEMPLAZA a la ayuda, no se apila con ella: dos renglones de texto
 * chico bajo un campo —uno explicando y otro retando— hacen que el formulario
 * salte de alto al validar y que el usuario tenga que leer dos veces para saber
 * qué corregir.
 *
 * El `id` se usa además para el `aria-describedby` del control, así que el mensaje
 * llega al lector de pantalla cuando el foco entra al campo, no sólo a la vista.
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  opcional = false,
  className,
  children,
}: {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  opcional?: boolean
  className?: string
  children: ReactNode
}) {
  const mensaje = error ?? ayuda

  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={id}
        className="flex items-baseline gap-1.5 text-sm font-medium text-slate-800"
      >
        {etiqueta}
        {opcional ? <span className="text-xs font-normal text-slate-400">opcional</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {mensaje ? (
        <p
          id={`${id}-ayuda`}
          className={cn('mt-1.5 text-xs', error ? 'text-red-600' : 'text-slate-500')}
        >
          {mensaje}
        </p>
      ) : null}
    </div>
  )
}
