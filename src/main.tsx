import { createRoot } from 'react-dom/client'

// Sólo los subsets latinos: la UI está en español y así el bundle no arrastra
// griego ni cirílico.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@/index.css'

import { ConfiguracionFaltante } from '@/pages/ConfiguracionFaltante'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el elemento #root en index.html')

const root = createRoot(contenedor)

/**
 * El cliente de Supabase falla al importarse si faltan las variables de entorno.
 * Por eso la app entra por un import dinámico: así, en vez de una pantalla en
 * blanco, mostramos qué hay que configurar.
 */
async function arrancar() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    root.render(<ConfiguracionFaltante />)
    return
  }

  const { Root } = await import('@/Root')
  root.render(<Root />)
}

void arrancar()
