import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'

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
// La consulta de ventas por producto. Aparte porque es una pantalla de
// consulta puntual, que la mayoría de las sesiones no abre.
const VentasProductosPage = lazy(() =>
  import('@/features/productos/VentasProductosPage').then((m) => ({
    default: m.VentasProductosPage,
  })),
)
// Sorteos va aparte de las otras dos: es la única pantalla que escribe, y su
// formulario no tiene por qué viajar en el bundle de quien sólo entra a mirar.
const SorteosPage = lazy(() =>
  import('@/features/sorteos/SorteosPage').then((m) => ({ default: m.SorteosPage })),
)
const SorteoFormPage = lazy(() =>
  import('@/features/sorteos/SorteoFormPage').then((m) => ({ default: m.SorteoFormPage })),
)
// La pantalla de presentacion va aparte: arrastra confeti, QR y sonido, y no
// tiene por que viajar en el bundle de quien entra a cargar un sorteo.
const PresentarSorteoPage = lazy(() =>
  import('@/features/sorteos/PresentarSorteoPage').then((m) => ({
    default: m.PresentarSorteoPage,
  })),
)
// La constancia publica. Sin sesion, y fuera de todo layout.
const ResultadoPublicoPage = lazy(() =>
  import('@/features/sorteos/ResultadoPublicoPage').then((m) => ({
    default: m.ResultadoPublicoPage,
  })),
)
// El padron va aparte del resto: su tabla y su panel de edicion no tienen por
// que viajar en el bundle de quien entra a mirar el dashboard.
const PadronPage = lazy(() =>
  import('@/features/padron/PadronPage').then((m) => ({ default: m.PadronPage })),
)
// El formulario publico. Lazy para que el widget de Turnstile y su catalogo de
// ciudades no entren en el bundle que se baja quien viene a trabajar.
const RegistroClientePage = lazy(() =>
  import('@/features/publico/RegistroClientePage').then((m) => ({
    default: m.RegistroClientePage,
  })),
)

function CargandoPagina() {
  return <SkeletonRows rows={6} />
}

/**
 * La ejecucion del sorteo vivia embebida en el layout admin, en
 * `/sorteos/:id/sortear`. Se mudo a `/sorteos/:id/presentar`, fuera del layout.
 *
 * Esto no es codigo muerto: es la puerta para los enlaces viejos, que pueden
 * estar en el historial o en una pestana abierta. `replace` para que el boton de
 * volver no rebote entre las dos rutas.
 */
function RedirigirAPresentar() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/sorteos/${id ?? ''}/presentar`} replace />
}

export function App() {
  return (
    <Routes>
      {/* Sin guardas y sin AppLayout: la abre gente sin cuenta, tipicamente
          escaneando un QR en el local. Al estar fuera de ProtectedRoute no
          espera a que AuthProvider resuelva la sesion. */}
      <Route
        path="/public/clientes"
        element={
          <Suspense fallback={<CargandoPagina />}>
            <RegistroClientePage />
          </Suspense>
        }
      />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* La constancia publica: sin sesion y sin layout. Es un enlace que se
          comparte en redes, asi que tiene que abrir para cualquiera. */}
      <Route
        path="/sorteo/resultado/:slug"
        element={
          <Suspense fallback={<CargandoPagina />}>
            <ResultadoPublicoPage />
          </Suspense>
        }
      />

      <Route element={<ProtectedRoute />}>
        {/* La pantalla de presentacion esta DENTRO de ProtectedRoute pero FUERA
            de AppLayout: exige sesion —sin ella, ProtectedRoute manda al login y
            vuelve— y no puede tener sidebar ni header, porque se graba. */}
        <Route
          path="/sorteos/:id/presentar"
          element={
            <Suspense fallback={<CargandoPagina />}>
              <PresentarSorteoPage />
            </Suspense>
          }
        />

        <Route element={<AppLayout />}>
          {/* El enlace viejo de la ejecucion embebida. Se redirige en vez de
              devolver 404: puede estar en el historial de alguien. */}
          <Route
            path="sorteos/:id/sortear"
            element={<RedirigirAPresentar />}
          />
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
          <Route
            path="productos"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <VentasProductosPage />
              </Suspense>
            }
          />
          <Route
            path="padron"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <PadronPage />
              </Suspense>
            }
          />
          <Route
            path="sorteos"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <SorteosPage />
              </Suspense>
            }
          />
          {/* `nuevo` antes que `:id` para que se lea: un segmento estático gana
              siempre contra un parámetro, pero el orden lo deja explícito. */}
          <Route
            path="sorteos/nuevo"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <SorteoFormPage />
              </Suspense>
            }
          />
          <Route
            path="sorteos/:id"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <SorteoFormPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
