import type { InputHTMLAttributes } from 'react'

import { inputBaseClass } from '@/components/ui/inputStyles'
import { cn } from '@/lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(inputBaseClass, className)} {...props} />
}
