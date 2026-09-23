import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ProtectedRoute, PublicOnlyRoute } from '@/auth/ProtectedRoute'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Las dos pantallas van por separado: así Recharts (que sólo usa el dashboard) no
// entra en el bundle inicial ni retrasa el login.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const FacturasPage = lazy(() =>
  import('@/features/facturas/FacturasPage').then((m) => ({ default: m.FacturasPage })),
)

function CargandoPagina() {
  return <SkeletonRows rows={6} />
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<CargandoPagina />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="facturas"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <FacturasPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
