import { Check, Copy, ExternalLink, Eye, EyeOff, Sparkles, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/buttonStyles'
import { usePublicarResultado } from '@/features/sorteos/apiEjecucion'
import { mensajeDeError } from '@/features/sorteos/errores'
import { cn } from '@/lib/cn'
import type { Sorteo } from '@/types/database'

/**
 * El sorteo en sí: entrar a sortearlo, y después qué hacer con la constancia.
 *
 * Son dos momentos del mismo asunto y por eso viven en un panel y no en dos: en
 * CERRADO lo único que queda por hacer es sortear, y apenas se sortea lo único
 * que queda es decidir cómo se publica. Nunca se muestran los dos a la vez.
 */
export function PanelEjecucion({ sorteo }: { sorteo: Sorteo }) {
  if (sorteo.estado === 'CERRADO') return <ParaSortear sorteo={sorteo} />
  if (sorteo.estado === 'SORTEADO' && sorteo.resultado_slug) return <YaSorteado sorteo={sorteo} />
  return null
}

/**
 * La entrada a la pantalla de presentación, desde el detalle.
 *
 * El listado ya tiene la suya, pero quien termina de configurar un sorteo está
 * ACÁ, y mandarlo de vuelta al listado para encontrar el botón sería hacerle
 * recorrer el camino dos veces.
 */
function ParaSortear({ sorteo }: { sorteo: Sorteo }) {
  return (
    <Card>
      <CardHeader
        title="Sortear"
        description="Se abre en otra pestaña, a pantalla completa, lista para grabar."
      />
      <CardBody className="space-y-3">
        <Link
          to={`/sorteos/${String(sorteo.id)}/presentar`}
          target="_blank"
          rel="noreferrer"
          className={buttonClass({ variant: 'primary', size: 'sm', className: 'w-full' })}
        >
          <Sparkles className="size-3.5" aria-hidden />
          Sortear
        </Link>
        <p className="text-xs text-slate-500">
          Al entrar se congela la lista de participantes y se publica el compromiso del sorteo. Las
          facturas que lleguen después ya no entran.
        </p>
      </CardBody>
    </Card>
  )
}

/**
 * Lo que se puede hacer con un sorteo YA sorteado: mirar el acta y decidir si la
 * constancia pública está o no disponible.
 *
 * ── Por qué despublicar es una acción de primera clase ─────────────────────
 * El link se comparte en redes y queda circulando. Si algo sale mal —un ganador
 * que pide que lo saquen, un error en el premio— hace falta poder bajar la
 * página sin borrar el acta ni tocar el resultado. Por eso es un interruptor y
 * no un borrado: la RPC pública deja de devolver datos, y el registro queda.
 */
function YaSorteado({ sorteo }: { sorteo: Sorteo }) {
  const publicar = usePublicarResultado()
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const url = `${window.location.origin}/sorteo/resultado/${sorteo.resultado_slug}`
  const publicado = sorteo.resultado_publicado

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles —pasa en http:// y en algunos WebView— el
      // enlace sigue estando a la vista para copiarlo a mano.
      setError('No pudimos copiar. El enlace está acá abajo para copiarlo a mano.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Página de resultados"
        description="La constancia pública que se comparte en redes."
      />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copiar()}>
            {copiado ? (
              <>
                <Check className="size-3.5 text-emerald-600" aria-hidden />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden />
                Copiar link
              </>
            )}
          </Button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-accent-600 transition-colors hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Abrir
          </a>

          <Link
            to={`/sorteos/${String(sorteo.id)}/presentar`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
          >
            <Trophy className="size-3.5" aria-hidden />
            Ver ganadores
          </Link>
        </div>

        {/* El enlace, a la vista y seleccionable. No es redundante con el botón:
            cuando el portapapeles falla, esto es lo que salva el momento. */}
        <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs break-all text-slate-600 ring-1 ring-slate-200 ring-inset">
          {url}
        </p>

        <button
          type="button"
          onClick={() => {
            setError(null)
            publicar.mutate(
              { id: Number(sorteo.id), valor: !publicado },
              { onError: (causa) => setError(mensajeDeError(causa, 'No pudimos cambiarlo.')) },
            )
          }}
          disabled={publicar.isPending}
          className={cn(
            'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
            'disabled:opacity-60',
            publicado ? 'bg-emerald-50 hover:bg-emerald-100/70' : 'bg-slate-50 hover:bg-slate-100',
          )}
        >
          {publicado ? (
            <Eye className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <EyeOff className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-900">
              {publicado ? 'La página está publicada' : 'La página está despublicada'}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {publicado
                ? 'Cualquiera con el enlace puede verla. Tocá para bajarla.'
                : 'El enlace no muestra nada, ni siquiera que el sorteo existe. Tocá para publicarla.'}
            </span>
          </span>
        </button>

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}
