import type { TextareaHTMLAttributes } from 'react'

import { inputBaseClass } from '@/components/ui/inputStyles'
import { cn } from '@/lib/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

/**
 * Mismo aro y mismo foco que `Input`: en un formulario, un campo de varias líneas
 * que no comparte el vocabulario visual del resto se lee como otro control.
 *
 * `field-sizing-content` deja que el campo crezca con el texto en los navegadores
 * que ya lo soportan; el `rows` del consumidor sigue siendo el piso.
 */
export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(inputBaseClass, 'resize-y [field-sizing:content]', className)}
      {...props}
    />
  )
}
