import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto bg-slate-50 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <FileQuestion className="size-6" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900">Página no encontrada</p>
        <p className="mt-1 text-sm text-slate-500">
          La dirección a la que quisiste entrar no existe en Factyble Cloud.
        </p>
      </div>
      <Link
        to="/"
        className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
