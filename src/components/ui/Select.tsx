import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  /** Clases para el contenedor; acá van las utilidades de layout y visibilidad. */
  contenedorClassName?: string
}

export function Select({ options, className, contenedorClassName, ...props }: SelectProps) {
  return (
    <div className={cn('relative', contenedorClassName)}>
      <select
        className={cn(
          'w-full appearance-none rounded-lg border-0 bg-white py-2 pr-9 pl-3 text-sm text-slate-900',
          'ring-1 ring-slate-200 ring-inset',
          'focus:ring-2 focus:ring-accent-600 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-slate-50',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  )
}
