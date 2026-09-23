import { FileText, LayoutDashboard, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/facturas', label: 'Facturas', icon: FileText },
]

function Marca() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-5 py-5">
      <img
        src="/pwa-192x192.png"
        alt=""
        className="size-9 rounded-lg bg-white/10 p-0.5"
        aria-hidden
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-white">Factyble</p>
        <p className="truncate text-xs text-brand-300">Cloud</p>
      </div>
    </div>
  )
}

function Navegacion({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 pb-4"
      aria-label="Secciones"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
              isActive
                ? 'bg-accent-600 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn('size-4.5', isActive ? 'text-white' : 'text-brand-300')} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Sidebar fijo de escritorio. */
export function Sidebar() {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col overflow-hidden bg-ink-900 lg:flex">
      <Marca />
      <Navegacion />
    </aside>
  )
}

/** Mismo contenido, como drawer en mobile. */
export function SidebarDrawer({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <div
      className={cn('fixed inset-0 z-40 lg:hidden', abierto ? 'pointer-events-auto' : 'hidden')}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-[1px]"
        onClick={onCerrar}
        aria-label="Cerrar menú"
      />
      <div className="relative flex h-full w-64 flex-col overflow-hidden bg-ink-900 shadow-xl">
        <button
          type="button"
          onClick={onCerrar}
          className="absolute top-4 right-3 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X className="size-4" aria-hidden />
        </button>
        <Marca />
        <Navegacion onNavigate={onCerrar} />
      </div>
    </div>
  )
}
