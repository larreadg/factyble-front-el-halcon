import type { Config, Context } from '@netlify/edge-functions'

/**
 * Las meta tags de la página pública de resultados, inyectadas en el servidor.
 *
 * ── Por qué no alcanza con hacerlo en React ─────────────────────────────────
 * El crawler de WhatsApp, Facebook, Instagram o Twitter pide el HTML y lee el
 * `<head>`. No ejecuta JavaScript. En una SPA eso significa que cualquier link
 * compartido se previsualiza con el título genérico del panel de facturación
 * —«Factyble Cloud · El Halcón»— sin importar qué haga el componente al montar.
 *
 * Y el link de un sorteo se comparte justamente ahí: en la bio de Instagram, en
 * un estado de WhatsApp, en la descripción de un reel. La previsualización ES la
 * primera impresión de la constancia.
 *
 * Así que esta función se mete en el medio: pide el `index.html` que Netlify iba
 * a servir igual, consulta la MISMA función pública que consume el navegador, y
 * reemplaza el `<head>` antes de devolverlo.
 *
 * ── Lo que NO hace, y es deliberado ────────────────────────────────────────
 * No inventa nada. Si el slug no existe, está despublicado, faltan las variables
 * de entorno o Supabase no contesta, devuelve el HTML tal como vino: la SPA
 * muestra su propio «Resultados no disponibles» y la previsualización queda
 * genérica. Una tarjeta linda que anuncia un sorteo inexistente sería peor que
 * ninguna tarjeta.
 *
 * Tampoco expone nada nuevo: llama a `sorteo_resultado_publico` con la anon key,
 * que es la única función que `anon` puede ejecutar en todo el módulo y que ya
 * devuelve los nombres enmascarados por la base. Esta función no ve un RUC ni un
 * teléfono ni un nombre completo.
 */

/**
 * Sólo lo que entra en una tarjeta de previsualización. La función devuelve
 * bastante más —los hashes de verificación, las facturas, las fechas— y nada de
 * eso tiene lugar en 160 caracteres.
 */
interface ResultadoPublico {
  sorteo_nombre: string
  marcas: string | null
  participantes: number | null
  premios: { ganador: string | null }[] | null
}

export default async function inyectarOg(request: Request, context: Context) {
  const respuesta = await context.next()

  // Sólo el documento. Los assets pasan de largo: leerlos como texto para no
  // tocarlos sería gastar el tiempo de todos.
  const tipo = respuesta.headers.get('content-type') ?? ''
  if (!tipo.includes('text/html')) return respuesta

  const slug = new URL(request.url).pathname.split('/').filter(Boolean).pop()
  if (!slug) return respuesta

  const resultado = await consultar(slug)
  if (!resultado) return respuesta

  // El `<title>` y la `description` del index se QUITAN, no se acompañan: dos
  // títulos en un `<head>` dejan al crawler eligiendo, y el que está primero es
  // el genérico del panel.
  const nuevo = (await respuesta.text())
    .replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/i, '')
    .replace(/[ \t]*<meta\s+name="description"[^>]*>\r?\n?/i, '')
    .replace('</head>', `${etiquetas(resultado, request.url)}\n  </head>`)

  // El HTML creció, así que los encabezados que describen al original dejan de
  // ser ciertos. Un `content-length` viejo corta la respuesta a mitad del
  // `<head>`; un `etag` viejo hace que el CDN sirva la versión sin las etiquetas.
  const encabezados = new Headers(respuesta.headers)
  encabezados.delete('content-length')
  encabezados.delete('etag')

  return new Response(nuevo, { status: respuesta.status, headers: encabezados })
}

export const config: Config = {
  path: '/sorteo/resultado/*',
}

/* ───────────────────────────── La consulta ───────────────────────────── */

async function consultar(slug: string): Promise<ResultadoPublico | null> {
  const url = Netlify.env.get('SUPABASE_URL') ?? Netlify.env.get('VITE_SUPABASE_URL')
  const clave = Netlify.env.get('SUPABASE_ANON_KEY') ?? Netlify.env.get('VITE_SUPABASE_ANON_KEY')
  if (!url || !clave) return null

  try {
    // 2,5 s de techo: el crawler no espera para siempre, y una constancia sin
    // tarjeta es mejor que un link que tarda en previsualizarse.
    const corte = AbortSignal.timeout(2500)

    const respuesta = await fetch(`${url}/rest/v1/rpc/sorteo_resultado_publico`, {
      method: 'POST',
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: slug }),
      signal: corte,
    })
    if (!respuesta.ok) return null

    const filas = (await respuesta.json()) as ResultadoPublico[]
    return filas[0] ?? null
  } catch {
    // Timeout, DNS, 500: cualquiera de los tres deja la página tal como estaba.
    return null
  }
}

/* ───────────────────────────── Las etiquetas ───────────────────────────── */

function etiquetas(r: ResultadoPublico, urlActual: string): string {
  const url = new URL(urlActual)
  const titulo = `${r.sorteo_nombre} · Resultados`
  const imagen = `${url.origin}/eh.png`

  const partes: string[] = []
  if (r.marcas) partes.push(r.marcas)
  if (r.participantes) partes.push(`${r.participantes.toString()} facturas participantes`)

  const ganadores = (r.premios ?? [])
    .map((premio) => premio.ganador)
    .filter((nombre): nombre is string => Boolean(nombre))
  if (ganadores.length > 0) partes.push(`Ganan ${lista(ganadores)}`)

  const descripcion = recortar(
    partes.join(' · ') || 'Resultado del sorteo de El Halcón Ferretería.',
  )

  return [
    '',
    '    <!-- Inyectado por netlify/edge-functions/resultado-og.ts -->',
    meta('description', descripcion, 'name'),
    meta('og:type', 'article'),
    meta('og:site_name', 'El Halcón Ferretería'),
    meta('og:locale', 'es_PY'),
    meta('og:url', url.href),
    meta('og:title', titulo),
    meta('og:description', descripcion),
    meta('og:image', imagen),
    // Las medidas reales del logo. Declararlas evita que el crawler tenga que
    // descargar la imagen para decidir el layout de la tarjeta.
    meta('og:image:width', '1920'),
    meta('og:image:height', '1920'),
    meta('og:image:alt', 'El Halcón Ferretería'),
    // `summary` y no `summary_large_image`: la imagen es un logo cuadrado, y la
    // tarjeta grande lo recortaría a una franja.
    meta('twitter:card', 'summary', 'name'),
    meta('twitter:title', titulo, 'name'),
    meta('twitter:description', descripcion, 'name'),
    meta('twitter:image', imagen, 'name'),
    `    <title>${escapar(titulo)}</title>`,
  ].join('\n')
}

function meta(clave: string, valor: string, atributo: 'property' | 'name' = 'property'): string {
  return `    <meta ${atributo}="${clave}" content="${escapar(valor)}" />`
}

/** «A», «A y B», «A, B y C» — como se lee en voz alta, no como lo haría un CSV. */
function lista(nombres: string[]): string {
  if (nombres.length === 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1] ?? ''}`
}

/** Las previsualizaciones cortan alrededor de 160 caracteres; cortamos nosotros. */
function recortar(texto: string): string {
  if (texto.length <= 160) return texto
  return `${texto.slice(0, 157).trimEnd()}…`
}

/**
 * El nombre de un sorteo lo escribe una persona en el panel y termina dentro de
 * un atributo HTML. Sin escapar, un nombre con una comilla rompe el `<head>`.
 */
function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
