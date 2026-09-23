import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Barra fija que aparece cuando el navegador se queda sin conexión. Instalada
 * como PWA la app sigue abriendo, pero los datos vienen de Supabase: conviene
 * que se vea por qué dejaron de actualizarse.
 */
export function IndicadorSinConexion() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)

  useEffect(() => {
    const marcarEnLinea = () => setEnLinea(true)
    const marcarSinConexion = () => setEnLinea(false)

    window.addEventListener('online', marcarEnLinea)
    window.addEventListener('offline', marcarSinConexion)
    return () => {
      window.removeEventListener('online', marcarEnLinea)
      window.removeEventListener('offline', marcarSinConexion)
    }
  }, [])

  if (enLinea) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white"
    >
      <WifiOff className="size-3.5" aria-hidden />
      <span>Sin conexión — los datos pueden estar desactualizados.</span>
    </div>
  )
}
