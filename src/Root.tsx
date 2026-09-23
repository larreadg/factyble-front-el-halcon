import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { App } from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import { AvisoActualizacion } from '@/pwa/AvisoActualizacion'
import { IndicadorSinConexion } from '@/pwa/IndicadorSinConexion'

/** Árbol de providers de la app, cargado sólo cuando hay configuración válida. */
export function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
        <IndicadorSinConexion />
        <AvisoActualizacion />
      </QueryClientProvider>
    </StrictMode>
  )
}
