import { Settings2 } from 'lucide-react'

/** Se muestra cuando faltan las variables de entorno de Supabase. */
export function ConfiguracionFaltante() {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Settings2 className="size-5" aria-hidden />
        </div>
        <h1 className="text-base font-semibold text-slate-900">Falta configurar Supabase</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Copiá <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.example</code> a{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code>, completá las
          dos variables y reiniciá el servidor de desarrollo.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2.5 text-xs text-slate-100">
          {'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY='}
        </pre>
      </div>
    </div>
  )
}
