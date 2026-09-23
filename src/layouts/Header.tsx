import { ChevronDown, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { SyncIndicator } from '@/features/sync/SyncIndicator'
import { cn } from '@/lib/cn'

export function Header({ titulo, onAbrirMenu }: { titulo: string; onAbrirMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:h-18 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{titulo}</h1>

      <img
        src="/eh.png"
        alt="El Halcón Ferretería"
        className="h-9 w-auto shrink-0 object-contain sm:h-14"
      />
      <span className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

      <SyncIndicator className="hidden sm:flex" />
      <MenuUsuario />
    </header>
  )
}

function MenuUsuario() {
  const { user, cerrarSesion } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    function alClickAfuera(event: MouseEvent) {
      if (!contenedor.current?.contains(event.target as Node)) setAbierto(false)
    }
    function alEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', alClickAfuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClickAfuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  const email = user?.email ?? 'Sesión activa'
  const inicial = email.charAt(0).toUpperCase()

  async function salir() {
    setSaliendo(true)
    try {
      await cerrarSesion()
    } finally {
      setSaliendo(false)
      setAbierto(false)
    }
  }

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={cn(
          'flex h-10 shrink-0 items-center gap-2 rounded-lg px-1.5 text-sm transition-colors sm:pr-2',
          'hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
          abierto && 'bg-slate-100',
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-600 text-xs font-semibold text-white">
          {inicial}
        </span>
        <span className="hidden max-w-40 truncate text-slate-700 md:inline">{email}</span>
        <ChevronDown className="hidden size-4 text-slate-400 sm:block" aria-hidden />
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
        >
          <div className="flex items-start gap-2 border-b border-slate-100 px-3 py-3">
            <UserIcon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Sesión iniciada como</p>
              <p className="truncate text-sm font-medium text-slate-900" title={email}>
                {email}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void salir()}
            disabled={saliendo}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <LogOut className="size-4 text-slate-400" aria-hidden />
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
