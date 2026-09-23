import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { traducirErrorAuth } from '@/auth/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
    <div className="relative h-full overflow-y-auto bg-ink-950">
      {/* Halo tenue del petróleo de marca: da profundidad sin pesar en el render. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-ink-900),transparent_72%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-112 flex-col justify-center px-5 py-6">
        {/* La hoja se compone como un membrete: marca arriba, formulario debajo. */}
        <div className="animate-entrada-suave overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-950/50">
          <div className="h-[3px] bg-halcon" aria-hidden />

          <div className="px-7 pt-8 pb-5 sm:px-9">
            <img
              src="/eh.png"
              alt="El Halcón Ferretería"
              className="mx-auto h-28 w-auto object-contain sm:h-32"
              width={1920}
              height={1920}
            />
          </div>

          <form
            onSubmit={(event) => void onSubmit(event)}
            className="border-t border-slate-200 px-7 pt-7 pb-9 sm:px-9"
            noValidate
          >
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Factyble Cloud</h1>
            <p className="mt-1 text-sm text-slate-600">Ingresá con tu cuenta de trabajo.</p>

            <div className="mt-7 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="h-11 pl-10"
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
                    className="h-11 pr-12 pl-10"
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
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-white/70">
          <img src="/pwa-192x192.png" alt="" className="size-4 rounded" aria-hidden />
          <span className="font-medium text-white/85">Factyble</span>
          <span aria-hidden>·</span>
          <span>Facturación electrónica</span>
        </p>
      </div>
    </div>
  )
}
