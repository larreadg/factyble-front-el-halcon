import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/Button'

/** Cada cuánto le volvemos a preguntar al servidor si hay una versión nueva. */
const INTERVALO_CHEQUEO_MS = 60 * 60 * 1000

/**
 * Registra el service worker y, cuando hay una versión nueva esperando, ofrece
 * recargar. No se actualiza solo a propósito: recargar sin avisar le cambiaría
 * la pantalla al usuario en medio de un reporte.
 */
export function AvisoActualizacion() {
  const {
    needRefresh: [necesitaRefrescar, setNecesitaRefrescar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return
      setInterval(() => {
        // Sin conexión el update() falla y no aporta nada: lo salteamos.
        if (navigator.onLine) void registro.update()
      }, INTERVALO_CHEQUEO_MS)
    },
  })

  if (!necesitaRefrescar) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-entrada-suave fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="text-accent-600 mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Hay una versión nueva</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Recargá para usar la última versión de Factyble Cloud.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Recargar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setNecesitaRefrescar(false)}>
              Más tarde
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNecesitaRefrescar(false)}
          aria-label="Cerrar aviso"
          className="focus-visible:outline-accent-600 -mt-1 -mr-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
