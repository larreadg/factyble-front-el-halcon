import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Loader2, ShieldCheck, Ticket, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '@/lib/supabase'
import { formatDate, formatDateTime, formatFechaCalendario } from '@/lib/dates'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { PremioPublico, ResultadoPublico } from '@/types/database'

/**
 * La constancia pública de un sorteo. Sin sesión, fuera del panel.
 *
 * ── Qué es y qué no ────────────────────────────────────────────────────────
 * Es el link que va en la bio de Instagram o en la descripción del post: la
 * prueba de que el sorteo se hizo, quién ganó y con qué reglas. No es una
 * pantalla de administración ni se puede sortear desde acá — no existe ningún
 * enlace público que ejecute nada.
 *
 * ── De dónde salen los datos ───────────────────────────────────────────────
 * De UNA función `security definer`, que es lo único que `anon` puede ejecutar
 * en todo el módulo. El navegador no lee ni una tabla, y el nombre del ganador
 * llega YA enmascarado desde la base: el completo nunca sale del servidor.
 *
 * ── Si el slug no existe o está despublicado ───────────────────────────────
 * El mensaje es el MISMO. Distinguirlos convertiría esta página en un detector
 * de slugs válidos, y el slug es lo único que protege la constancia.
 */

function useResultadoPublico(slug: string | undefined) {
  return useQuery({
    queryKey: ['resultado-publico', slug] as const,
    queryFn: async (): Promise<ResultadoPublico | null> => {
      const { data, error } = await supabase.rpc('sorteo_resultado_publico', {
        p_slug: slug as string,
      })
      if (error) throw error
      return data[0] ?? null
    },
    enabled: Boolean(slug),
    // Una constancia no cambia: es un hecho pasado.
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function ResultadoPublicoPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isPending, isError } = useResultadoPublico(slug)

  useEffect(() => {
    // Las meta tags de verdad las inyecta la Edge Function de Netlify antes de
    // servir el HTML —un crawler no ejecuta JavaScript—, pero el `<title>` sí
    // conviene ajustarlo para la pestaña de quien ya está mirando.
    if (!data) return
    const anterior = document.title
    document.title = `${data.sorteo_nombre} · Resultados`
    return () => {
      document.title = anterior
    }
  }, [data])

  if (isPending) {
    return (
      <Hoja>
        <Loader2 className="size-8 animate-spin text-white/30" aria-hidden />
      </Hoja>
    )
  }

  if (isError || !data) {
    return (
      <Hoja>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white">Resultados no disponibles</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
            Este enlace no corresponde a ningún sorteo publicado. Si lo recibiste de El Halcón,
            puede que todavía no se haya sorteado.
          </p>
        </div>
      </Hoja>
    )
  }

  const premios = data.premios ?? []

  return (
    <Hoja>
      <article className="w-full max-w-2xl">
        <header className="flex flex-col items-center text-center">
          <img src="/eh.png" alt="El Halcón Ferretería" className="h-20 w-auto object-contain" />
          <p className="mt-4 text-xs font-medium tracking-wide text-halcon uppercase">
            Resultado del sorteo
          </p>
          <h1 className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight text-white text-balance sm:text-3xl">
            {data.sorteo_nombre}
          </h1>
          {data.marcas ? <p className="mt-2 text-sm text-white/45">{data.marcas}</p> : null}
          {/* Las reglas van en la constancia, no sólo en el afiche: sin ellas no
              se puede rehacer la cuenta, porque el formato de la lista que se
              hashea depende de si hubo cupones. */}
          <Reglas
            porCupon={data.guaranies_por_cupon}
            minimo={data.monto_minimo_compra}
            facturas={data.participantes}
          />
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato icono={CalendarDays} etiqueta="Período">
            {formatFechaCalendario(data.fecha_inicio)} – {formatFechaCalendario(data.fecha_fin)}
          </Dato>
          <Dato icono={Trophy} etiqueta="Sorteado">
            {data.sorteado_en ? formatDateTime(data.sorteado_en) : '—'}
          </Dato>
          <Dato icono={Ticket} etiqueta={data.guaranies_por_cupon ? 'Cupones' : 'Facturas'}>
            {formatNumber((data.guaranies_por_cupon ? data.cupones : data.participantes) ?? 0)}
          </Dato>
          <Dato icono={Users} etiqueta="Clientes">
            {formatNumber(data.clientes ?? 0)}
          </Dato>
        </dl>

        <ol className="mt-8 flex flex-col gap-3">
          {premios.map((premio, indice) => (
            <Ganador
              key={premio.orden}
              premio={premio}
              principal={indice === 0}
              conCupones={data.guaranies_por_cupon !== null}
            />
          ))}
        </ol>

        <Verificacion
          bolillero={data.bolillero_hash}
          compromiso={data.semilla_hash}
          semilla={data.semilla}
          porCupon={data.guaranies_por_cupon}
        />

        <p className="mt-10 text-center text-xs text-white/25">
          El Halcón Ferretería · Esta página es la constancia del sorteo.
        </p>
      </article>
    </Hoja>
  )
}

/* ────────────────────────────── Piezas ────────────────────────────── */

function Hoja({ children }: { children: React.ReactNode }) {
  return (
    /* El scroll es PROPIO, no del documento: `index.css` le pone
       `overflow: hidden` a `html` y `body` porque el panel es una app de una
       sola pantalla que scrollea por dentro. Sin este contenedor, la sección de
       verificación queda abajo del pliegue y no hay forma de llegar a ella. */
    <div className="relative h-dvh overflow-x-hidden overflow-y-auto bg-ink-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-ink-900),transparent_72%)]"
        aria-hidden
      />
      <div className="relative flex min-h-full items-center justify-center px-5 py-10 sm:px-8">
        {children}
      </div>
    </div>
  )
}

/**
 * Las reglas con las que se jugó, en una línea.
 *
 * No es adorno: quien quiera verificar necesita saber si el sorteo fue por
 * factura o por cupones, porque de eso depende qué lista se hashea y sobre
 * cuántos elementos se derivó el ganador.
 */
function Reglas({
  porCupon,
  minimo,
  facturas,
}: {
  porCupon: number | null
  minimo: number | null
  facturas: number | null
}) {
  const partes: string[] = []
  if (porCupon) partes.push(`1 cupón cada ${formatCurrency(porCupon)}`)
  else partes.push('1 chance por factura')
  if (minimo) partes.push(`compra mínima de ${formatCurrency(minimo)}`)
  if (porCupon && facturas) partes.push(`${formatNumber(facturas)} facturas participantes`)

  return (
    <p className="mt-3 rounded-full bg-white/[0.06] px-4 py-1.5 text-xs text-white/55">
      {partes.join(' · ')}
    </p>
  )
}

function Dato({
  icono: Icono,
  etiqueta,
  children,
}: {
  icono: React.ComponentType<{ className?: string }>
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/10 ring-inset">
      <dt className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/35 uppercase">
        <Icono className="size-3 shrink-0" aria-hidden />
        {etiqueta}
      </dt>
      <dd className="mt-1 text-sm font-medium text-white/85 tabular-nums">{children}</dd>
    </div>
  )
}

function Ganador({
  premio,
  principal,
  conCupones,
}: {
  premio: PremioPublico
  principal: boolean
  conCupones: boolean
}) {
  return (
    <li
      className={
        principal
          ? 'rounded-2xl bg-halcon/12 px-5 py-4 ring-1 ring-halcon/30 ring-inset'
          : 'rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/10 ring-inset'
      }
    >
      <div className="flex items-start gap-4">
        <span
          className={
            principal
              ? 'grid size-9 shrink-0 place-items-center rounded-full bg-halcon text-sm font-semibold text-ink-950 tabular-nums'
              : 'grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white/60 tabular-nums'
          }
        >
          {premio.orden}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/40">{premio.premio}</p>
          <p
            className={
              principal
                ? 'mt-0.5 text-xl font-semibold tracking-tight text-white text-balance sm:text-2xl'
                : 'mt-0.5 text-lg font-semibold tracking-tight text-white text-balance'
            }
          >
            {premio.ganador ?? 'Sin nombre'}
          </p>
          {/* La factura va completa: es lo que le permite al ganador reconocerse
              sin que la página exponga su documento. */}
          <p className="mt-1 text-sm text-white/45 tabular-nums">
            Factura {premio.factura}
            {/* `formatDate` y no `formatFechaCalendario`: `factura_fecha` es la
                `fecha_emision` de la factura, un timestamptz — no un día suelto.
                Pasado por el formateador de días daba «—». */}
            {premio.factura_fecha ? ` · ${formatDate(premio.factura_fecha)}` : ''}
          </p>
          <p className="mt-1 text-xs text-white/25 tabular-nums">
            Salió {conCupones ? 'el cupón' : 'la posición'} {formatNumber(premio.posicion)} de{' '}
            {formatNumber(premio.de)}
          </p>
        </div>
      </div>
    </li>
  )
}

/**
 * Cómo verificar el sorteo.
 *
 * No es adorno legal: es la diferencia entre «confiá en nosotros» y una prueba.
 * Con la semilla revelada, el hash de la lista y el método, cualquiera repite la
 * cuenta y tiene que obtener los mismos ganadores.
 */
function Verificacion({
  bolillero,
  compromiso,
  semilla,
  porCupon,
}: {
  bolillero: string | null
  compromiso: string | null
  semilla: string | null
  porCupon: number | null
}) {
  const [abierta, setAbierta] = useState(false)
  if (!bolillero || !compromiso || !semilla) return null

  return (
    <section className="mt-8 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 ring-inset">
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400"
      >
        <ShieldCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
        <span className="flex-1 text-sm font-medium text-white/80">Cómo verificar este sorteo</span>
        <span className="text-xs text-white/35">{abierta ? 'Ocultar' : 'Ver'}</span>
      </button>

      {abierta ? (
        <div className="space-y-4 border-t border-white/10 px-5 py-5 text-sm text-white/55">
          <p>
            Antes de sortear el primer premio, el sistema congeló la lista de facturas participantes
            y generó una semilla al azar. Publicó el <strong>hash de la lista</strong> y el{' '}
            <strong>hash de la semilla</strong> —sin mostrar la semilla— y recién al terminar la
            reveló. Cada ganador se calcula a partir de esa semilla, así que el resultado estaba
            determinado antes de conocerse, y no se podía cambiar sin que los hashes dejaran de
            coincidir.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-white/50">
            <li>
              Pedí a El Halcón la lista de facturas participantes y comprobá que su SHA-256 coincide
              con el hash publicado acá.{' '}
              {porCupon ? (
                <>
                  Cada elemento es{' '}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                    id de factura:cupones
                  </code>
                  , separados por coma y ordenados por id.
                </>
              ) : (
                'Son los ids de factura, separados por coma y ordenados.'
              )}
            </li>
            <li>Comprobá que el SHA-256 de la semilla revelada da el compromiso publicado.</li>
            <li>
              Para cada premio, calculá{' '}
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
                HMAC-SHA256(semilla, «premio:&lt;id&gt;»)
              </code>
              , tomá sus primeros 7 bytes como número y sacá el resto de dividirlo por la cantidad
              de {porCupon ? 'cupones' : 'facturas'} elegibles. Esa posición, más uno, es{' '}
              {porCupon
                ? 'el cupón ganador; la factura es la primera cuyo acumulado de cupones lo alcanza.'
                : 'el ganador.'}
            </li>
          </ol>
          <dl className="space-y-2 font-mono text-xs break-all text-white/40">
            <div>
              <dt className="text-white/30">Hash de la lista</dt>
              <dd>{bolillero}</dd>
            </div>
            <div>
              <dt className="text-white/30">Compromiso de la semilla</dt>
              <dd>{compromiso}</dd>
            </div>
            <div>
              <dt className="text-white/30">Semilla revelada</dt>
              <dd>{semilla}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  )
}
