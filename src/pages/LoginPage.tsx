import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { traducirErrorAuth } from '@/auth/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const ANIO = new Date().getFullYear()

export function LoginPage() {
  const { iniciarSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(email.trim(), password)
      // El redirect lo resuelve PublicOnlyRoute cuando cambia la sesión.
    } catch (causa) {
      setError(traducirErrorAuth(causa))
      setEnviando(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-ink-950">
      {/* En móvil manda el formulario: la placa del cliente arriba y el resto de la marca se
          reserva para lg, donde recién hay ancho para un panel editorial. */}
      <div className="grid min-h-full grid-rows-[1fr] lg:h-full lg:grid-cols-2 lg:grid-rows-1">
        <aside className="relative hidden flex-col justify-between overflow-hidden px-6 pt-8 lg:flex lg:px-14 lg:py-12">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_0%,var(--color-ink-900),transparent_70%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-56 -left-40 size-[34rem] rounded-full border border-white/5"
            aria-hidden
          />

          {/* El logo del cliente es negro: sobre el petróleo necesita su propia placa blanca. */}
          <div className="relative inline-flex w-fit rounded-2xl bg-white p-3 shadow-lg shadow-ink-950/30">
            <img
              src="/eh.png"
              alt="El Halcón Ferretería"
              className="-mt-2 -mb-3 h-16 w-auto object-contain"
              width={1920}
              height={1920}
            />
          </div>

          <div className="relative hidden lg:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
              <Sparkles className="size-3.5 text-halcon" aria-hidden />
              Gestión simple para crecer
            </span>

            <p className="mt-8 text-5xl leading-[1.05] font-bold tracking-tight text-balance text-white">
              Todo tu negocio,
              <br />
              <span className="text-halcon">en un solo lugar.</span>
            </p>

            <p className="mt-6 max-w-md leading-relaxed text-white/70">
              Seguí tu facturación electrónica, tus clientes y tus productos con la claridad que tu
              equipo necesita.
            </p>

            <p className="mt-10 flex items-center gap-2.5 text-sm text-white/70">
              <ShieldCheck className="size-4.5 shrink-0 text-brand-300" aria-hidden />
              Plataforma segura y confiable para tu empresa
            </p>
          </div>

          <p className="relative hidden text-xs text-white/60 lg:block">
            © {ANIO} El Halcón Ferretería · Factyble Cloud
          </p>
        </aside>

        <main className="relative flex flex-col justify-center px-5 py-8 lg:bg-black/25 lg:px-14">
          <div className="animate-entrada-suave mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-black/40 sm:p-8">
            <img
              src="/pwa-192x192.png"
              alt=""
              className="size-12"
              width={192}
              height={192}
              aria-hidden
            />

            <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-ink-600 uppercase">
              Factyble Cloud
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ingresá tus datos para continuar con tu cuenta de trabajo.
            </p>

            <form onSubmit={(event) => void onSubmit(event)} className="mt-7" noValidate>
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nombre@empresa.com.py"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? 'login-error' : undefined}
                      className="h-11 bg-slate-50 pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <Input
                      id="password"
                      type={mostrarPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? 'login-error' : undefined}
                      className="h-11 bg-slate-50 pr-12 pl-10"
                    />
                    {/* `after` agranda el área táctil a 44px sin agrandar el botón. */}
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((previo) => !previo)}
                      className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors after:absolute after:-inset-1 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                      aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={mostrarPassword}
                    >
                      {mostrarPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <div
                  id="login-error"
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-600/20 ring-inset"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button type="submit" loading={enviando} className="mt-6 h-11 w-full">
                {enviando ? (
                  'Ingresando…'
                ) : (
                  <>
                    Ingresar
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-white/60 lg:hidden">
            © {ANIO} El Halcón Ferretería · Factyble Cloud
          </p>
        </main>
      </div>
    </div>
  )
}
