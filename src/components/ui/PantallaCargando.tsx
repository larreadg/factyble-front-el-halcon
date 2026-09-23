import { Loader2 } from 'lucide-react'

/** Placeholder de pantalla completa mientras resolvemos la sesión persistida. */
export function PantallaCargando() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <img src="/pwa-192x192.png" alt="" className="size-12 rounded-xl" />
        <Loader2 className="size-5 animate-spin text-accent-600" aria-hidden />
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  )
}
