import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Header } from '@/layouts/Header'
import { Sidebar, SidebarDrawer } from '@/layouts/Sidebar'

const TITULOS: Record<string, string> = {
  '/': 'Inicio',
  '/facturas': 'Facturas',
}

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  const titulo = TITULOS[location.pathname] ?? 'Factyble Cloud'

  // `fixed inset-0`: el shell ocupa el viewport y queda FUERA del flujo, así no
  // puede aportar alto al documento. Con `h-full`, el contenido del <main> seguía
  // contando para el scroll de la página: se podía scrollear con la rueda sobre el
  // sidebar y quedaba una franja vacía al pie.
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50">
      <Sidebar />
      <SidebarDrawer abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header titulo={titulo} onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
