import confetti from 'canvas-confetti'
import {
  ArrowLeft,
  Keyboard,
  Sparkle,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Ticket,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useSorteo } from '@/features/sorteos/api'
import {
  useEstadoPresentacion,
  useIniciarSorteo,
  useResultados,
  useSortearPremio,
} from '@/features/sorteos/apiEjecucion'
import { AyudaAtajos } from '@/features/sorteos/components/AyudaAtajos'
import { ContadorFactura } from '@/features/sorteos/components/ContadorFactura'
import { PodioFinal } from '@/features/sorteos/components/PodioFinal'
import { mensajeDeError } from '@/features/sorteos/errores'
import { enmascararNombre } from '@/features/sorteos/mascara'
import { fanfarria, suspenso } from '@/features/sorteos/sonido'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import type { SorteoResultado } from '@/types/database'

/**
 * La pantalla donde se sortea. Vive FUERA del layout admin, a propósito.
 *
 * ── Por qué no se parece a nada del panel ──────────────────────────────────
 * Es la única pantalla del proyecto cuyo trabajo es que la MIREN. Se graba y se
 * sube a Instagram, TikTok y Facebook, así que no puede tener una barra lateral
 * que diga "Factyble Cloud" ni el correo del operador en una esquina: eso sale
 * en el video. Ocupa el viewport entero, no scrollea, y todo lo que no sea el
 * sorteo se puede esconder con una tecla.
 *
 * ── Lo que se muestra ANTES de girar, y por qué importa ────────────────────
 * Cuántas facturas hay en el bolillero y cuántas personas representan. Es lo
 * que hace creíble una grabación: quien la mira ve el tamaño del bolillero antes
 * del giro, no después.
 *
 * ── Lo que esta pantalla NO decide ─────────────────────────────────────────
 * El ganador. Lo deriva la base de una semilla comprometida antes de empezar, y
 * ya está escrito cuando el contador arranca a trabar. La animación revela; no
 * sortea. Ver `schema_sorteo_publico.sql`, decisión 1.
 */

/** Los colores de la casa. El dorado de El Halcón manda. */
const COLORES = ['#fdad01', '#3bd1f9', '#1872f9', '#ffffff']

/** Los dos formatos en que se sube un video. */
type Formato = 'libre' | '16:9' | '9:16'

const PROPORCION: Record<Formato, number | null> = { libre: null, '16:9': 16 / 9, '9:16': 9 / 16 }

export function PresentarSorteoPage() {
  const { id } = useParams<{ id: string }>()
  const sorteoId = Number(id)
  const valido = Number.isInteger(sorteoId)

  const { data: detalle, isPending, isError } = useSorteo(id)
  const estado = useEstadoPresentacion(valido ? sorteoId : undefined)
  const resultados = useResultados(valido ? sorteoId : undefined)
  const iniciar = useIniciarSorteo(valido ? sorteoId : undefined)
  const sortear = useSortearPremio(valido ? sorteoId : undefined)

  const [premioTocado, setPremioTocado] = useState<number | null>(null)
  /**
   * Qué premio está en escena mientras gira o se revela.
   *
   * El acta se escribe en la base apenas contesta el servidor, o sea a los pocos
   * cientos de milisegundos de empezar el giro — tres segundos antes de que el
   * número termine de trabar. Desde ese momento el premio deja de estar
   * pendiente, y sin esto el riel de abajo lo tacharía y saltaría al siguiente
   * mientras la pantalla todavía está dando vueltas. En una grabación eso es
   * adelantar el final.
   */
  const [premioEnGiro, setPremioEnGiro] = useState<number | null>(null)
  /**
   * Cuántas facturas había en el bolillero cuando arrancó este giro.
   *
   * Por la misma razón: al escribirse el acta la base saca al ganador, y el
   * contador de abajo bajaría de 73 a 72 a mitad de la animación. El número que
   * se ve mientras gira tiene que ser sobre el que se está sorteando.
   */
  const [facturasEnGiro, setFacturasEnGiro] = useState<number | null>(null)
  const [cuponesEnGiro, setCuponesEnGiro] = useState<number | null>(null)
  const [giro, setGiro] = useState(0)
  const [girando, setGirando] = useState(false)
  const [acta, setActa] = useState<SorteoResultado | null>(null)
  const [revelado, setRevelado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controles de grabación.
  const [formato, setFormato] = useState<Formato>('libre')
  const [pantallaCompleta, setPantallaCompleta] = useState(false)
  const [modoLimpio, setModoLimpio] = useState(false)
  const [conSonido, setConSonido] = useState(false)
  const [ayudaAbierta, setAyudaAbierta] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  /**
   * La animación, y la salida de emergencia para quien pidió que no haya.
   *
   * `prefers-reduced-motion` se respeta: con esa preferencia activa el número
   * aparece de una, sin girar ni confeti. Pero esta pantalla es un espectáculo
   * que se graba, y quien la opera puede tener la preferencia puesta por su uso
   * diario y querer igual el show en cámara. Por eso hay un interruptor — y sólo
   * aparece cuando la preferencia está activa, para no agregarle un control a
   * todos los demás.
   */
  const [movimientoReducido] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [forzarAnimacion, setForzarAnimacion] = useState(false)
  const animar = !movimientoReducido || forzarAnimacion

  const contenedor = useRef<HTMLDivElement>(null)

  // El lienzo del confeti, para que dispare dentro del encuadre y no de la
  // ventana. Se crea a demanda porque la ref recién existe después del montaje;
  // si por lo que sea no está, cae en el `confetti` global y sigue funcionando.
  const lienzo = useRef<HTMLCanvasElement>(null)
  const canon = useRef<Canon | null>(null)
  const obtenerCanon = useCallback((): Canon => {
    canon.current ??= lienzo.current
      ? confetti.create(lienzo.current, { resize: true, useWorker: true })
      : confetti
    return canon.current
  }, [])

  const sorteo = detalle?.sorteo
  const premios = useMemo(() => detalle?.premios ?? [], [detalle])
  const actas = useMemo(() => resultados.data ?? [], [resultados.data])
  const yaSorteados = useMemo(() => new Set(actas.map((r) => r.premio_id)), [actas])
  const pendientes = useMemo(
    () => premios.filter((p) => !yaSorteados.has(Number(p.id))),
    [premios, yaSorteados],
  )

  const congelado = estado.data?.congelado_en != null
  const enmascarar = estado.data?.enmascarar ?? true
  const terminado = pendientes.length === 0 && premios.length > 0

  // El premio se DERIVA: el tocado si sigue pendiente, o el primero que quede.
  const premioElegido =
    premioTocado !== null && pendientes.some((p) => Number(p.id) === premioTocado)
      ? premioTocado
      : pendientes.length > 0
        ? Number(pendientes[0]?.id)
        : null

  /** Lo que la pantalla está mostrando: el que gira, o el que sigue. */
  const premioEnEscena =
    (girando || revelado) && premioEnGiro !== null ? premioEnGiro : premioElegido
  const premioActual = premios.find((p) => Number(p.id) === premioEnEscena)

  const puedeGirar =
    congelado && !girando && !revelado && premioElegido !== null && !sortear.isPending

  // ── Título propio: esta pantalla no pasa por el layout ───────────────────
  useEffect(() => {
    const anterior = document.title
    document.title = 'Sorteo en vivo · El Halcón'
    return () => {
      document.title = anterior
    }
  }, [])

  // ── Congelar el bolillero al entrar ──────────────────────────────────────
  // Idempotente del lado de la base: recargar no rehace nada.
  const yaPedido = useRef(false)
  useEffect(() => {
    if (yaPedido.current) return
    if (estado.data?.estado !== 'CERRADO' || congelado) return
    yaPedido.current = true
    iniciar.mutate(undefined, {
      onError: (causa) => setError(mensajeDeError(causa, 'No pudimos preparar el bolillero.')),
    })
  }, [estado.data?.estado, congelado, iniciar])

  // ── El cursor se esconde a los 2 s ───────────────────────────────────────
  useEffect(() => {
    let reloj = 0
    const mover = () => {
      setCursorVisible(true)
      window.clearTimeout(reloj)
      reloj = window.setTimeout(() => setCursorVisible(false), 2000)
    }
    mover()
    window.addEventListener('mousemove', mover)
    return () => {
      window.removeEventListener('mousemove', mover)
      window.clearTimeout(reloj)
    }
  }, [])

  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  const alTerminarElGiro = useCallback(() => {
    setGirando(false)
    setRevelado(true)
    if (conSonido) fanfarria()
    if (animar) lanzarConfeti(obtenerCanon())
  }, [conSonido, obtenerCanon, animar])

  const girar = useCallback(() => {
    if (!puedeGirar || premioElegido === null) return
    setError(null)
    setActa(null)
    setRevelado(false)
    setGiro((n) => n + 1)
    setPremioEnGiro(premioElegido)
    setFacturasEnGiro(estado.data?.elegibles ?? null)
    setCuponesEnGiro(estado.data?.cupones ?? null)
    setGirando(true)
    if (conSonido) suspenso()

    sortear.mutate(premioElegido, {
      // No se corta el giro: el contador tiene su propio tiempo. Que el servidor
      // conteste en 200 ms no es razón para que el sorteo dure 200 ms.
      onSuccess: (resultado) => setActa(resultado),
      onError: (causa) => {
        // Nunca un ganador falso: se corta la animación y se dice qué pasó.
        setGirando(false)
        setPremioEnGiro(null)
        setError(mensajeDeError(causa, 'No pudimos sortear este premio.'))
      },
    })
  }, [puedeGirar, premioElegido, conSonido, sortear, estado.data?.elegibles, estado.data?.cupones])

  const siguiente = useCallback(() => {
    setActa(null)
    setRevelado(false)
    setError(null)
    setPremioEnGiro(null)
    setFacturasEnGiro(null)
    setCuponesEnGiro(null)
    // El contador se acuerda de cuántos dígitos trabó. Sin remontarlo, el premio
    // que sigue arranca mostrando los siete trabados en cero, como si ya hubiera
    // salido un número.
    setGiro((n) => n + 1)
  }, [])

  // ── Atajos: el operador no toca el mouse en cámara ───────────────────────
  useEffect(() => {
    function alTeclado(evento: KeyboardEvent) {
      if (evento.target instanceof HTMLInputElement) return
      const tecla = evento.key

      if (tecla === '?' || (tecla === '/' && evento.shiftKey)) {
        evento.preventDefault()
        setAyudaAbierta((a) => !a)
        return
      }
      if (tecla === 'Escape') {
        setAyudaAbierta(false)
        return
      }
      if (tecla === ' ' || tecla === 'Enter') {
        evento.preventDefault()
        // Con todo sorteado, Espacio pasa al podio: es el mismo gesto de siempre
        // y no hay que buscar el mouse para cerrar la grabación.
        if (revelado) siguiente()
        else girar()
        return
      }
      if (tecla === 'f' || tecla === 'F') {
        evento.preventDefault()
        void alternarPantallaCompleta()
        return
      }
      if (tecla === 'h' || tecla === 'H') {
        evento.preventDefault()
        setModoLimpio((m) => !m)
        return
      }
      if (tecla === 'm' || tecla === 'M') {
        evento.preventDefault()
        setConSonido((s) => !s)
      }
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [girar, siguiente, revelado, terminado])

  async function alternarPantallaCompleta() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await contenedor.current?.requestFullscreen()
    } catch {
      // Un navegador que no deja pantalla completa no rompe nada.
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (!valido)
    return (
      <Escenario>
        <Mensaje titulo="Sorteo inválido" />
      </Escenario>
    )

  // `resultados` también: sin esperarlo, al recargar a mitad de un sorteo la
  // primera pantalla muestra el premio 1 como si nadie lo hubiera ganado, y
  // recién al llegar las actas salta al que va. Es un frame, pero es el frame
  // con el que empieza la grabación.
  if (isPending || estado.isPending || resultados.isPending) {
    return (
      <Escenario>
        <Loader2 className="size-9 animate-spin text-white/30" aria-hidden />
      </Escenario>
    )
  }

  if (isError || !sorteo || !estado.data) {
    return (
      <Escenario>
        <Mensaje
          titulo="No pudimos cargar este sorteo"
          detalle="Puede que no exista, o que la sesión haya vencido."
        />
        <Volver id={id} />
      </Escenario>
    )
  }

  if (estado.data.estado !== 'CERRADO' && estado.data.estado !== 'SORTEADO') {
    return (
      <Escenario>
        <Mensaje
          titulo="Todavía no se puede sortear"
          detalle={`El sorteo está en ${estado.data.estado}. Mientras esté abierto siguen entrando facturas al bolillero, y un ganador sacado a mitad del período no es un ganador. Cerralo desde el panel.`}
        />
        <Volver id={id} />
      </Escenario>
    )
  }

  const proporcion = PROPORCION[formato]

  return (
    <div
      ref={contenedor}
      // Lo lee `index.css` para devolver las animaciones cuando quien graba
      // pidió el show completo teniendo movimiento reducido activo.
      data-animacion={animar ? 'completa' : undefined}
      className={cn(
        'relative grid h-dvh w-screen place-items-center overflow-hidden bg-ink-950',
        !cursorVisible && 'cursor-none',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,var(--color-ink-900),transparent_75%)]"
        aria-hidden
      />

      {/* El lienzo. En `libre` ocupa todo; en 16:9 y 9:16 se encierra en esa
          proporción y se centra, para encuadrar exactamente lo que va a salir
          en el video. */}
      {/* `container-type: size` no es un detalle: convierte a este div en la
          unidad de medida de todo lo que está adentro. Los tamaños fluidos de
          la escena están en `cqw`/`cqh`, no en `vw`/`vh`, porque en 9:16 el
          lienzo mide 460 px de ancho dentro de una ventana de 1780: medido
          contra la ventana, un título de `4.6vw` daba 82 px y se comía la
          pantalla, los nombres de los ganadores se truncaban a cero y el riel
          de premios se montaba sobre el QR. Medido contra el lienzo, el mismo
          número da lo que tiene que dar en los dos encuadres. */}
      <div
        className="relative flex flex-col overflow-hidden [container-type:size]"
        style={
          proporcion
            ? { aspectRatio: String(proporcion), height: '100%', maxWidth: '100vw' }
            : { width: '100%', height: '100%' }
        }
      >
        <Cabecera
          sorteo={sorteo.nombre}
          marcas={(detalle.marcas ?? []).map((m) => m.marca_nombre).join(' · ')}
          oculta={modoLimpio}
          id={id}
        />

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3cqh] px-[4cqw]">
          {terminado && !acta ? (
            <PodioFinal
              actas={actas}
              enmascarar={enmascarar}
              slug={estado.data.resultado_slug}
              nombre={sorteo.nombre}
              canon={obtenerCanon()}
              animar={animar}
            />
          ) : (
            <>
              <p
                className={cn(
                  'text-center text-[min(1.6rem,3.2cqw)] font-semibold tracking-tight text-white/70',
                  girando && !acta && 'animate-latido-suspenso text-halcon',
                )}
              >
                {acta?.premio_nombre ?? premioActual?.nombre ?? 'Premio'}
              </p>

              <ContadorFactura
                key={giro}
                numero={acta?.factura_numero ?? null}
                prefijoPorDefecto={prefijoDe(actas[0]?.factura_numero)}
                girando={girando}
                conSonido={conSonido}
                animar={animar}
                onTermino={alTerminarElGiro}
              />

              {revelado && acta ? (
                <TarjetaGanador acta={acta} enmascarar={enmascarar} />
              ) : (
                <Bolillero
                  facturas={
                    girando && facturasEnGiro !== null ? facturasEnGiro : estado.data.elegibles
                  }
                  cupones={girando && cuponesEnGiro !== null ? cuponesEnGiro : estado.data.cupones}
                  clientes={estado.data.clientes}
                  listo={congelado}
                />
              )}

              {error ? (
                <p
                  role="alert"
                  className="max-w-[60ch] text-center text-[min(1rem,2.2cqw)] text-red-300"
                >
                  {error}
                </p>
              ) : null}

              {!girando && !modoLimpio ? (
                <BotonPrincipal
                  revelado={revelado}
                  terminado={terminado}
                  habilitado={revelado ? true : puedeGirar}
                  onClick={revelado ? siguiente : girar}
                />
              ) : null}
            </>
          )}
        </main>

        <Controles
          oculta={modoLimpio}
          formato={formato}
          onFormato={setFormato}
          pantallaCompleta={pantallaCompleta}
          onPantallaCompleta={() => void alternarPantallaCompleta()}
          conSonido={conSonido}
          onSonido={() => setConSonido((s) => !s)}
          onAyuda={() => setAyudaAbierta(true)}
          movimientoReducido={movimientoReducido}
          animar={animar}
          onAnimar={() => setForzarAnimacion((f) => !f)}
          premios={premios.map((p) => ({
            id: Number(p.id),
            nombre: p.nombre,
            // Mientras gira, el premio en juego todavía no está tachado aunque
            // su acta ya exista: el riel no puede contar el final antes que la
            // pantalla.
            ganada: yaSorteados.has(Number(p.id)) && !(girando && Number(p.id) === premioEnGiro),
            elegido: Number(p.id) === premioEnEscena,
          }))}
          onPremio={(idPremio) => {
            setPremioTocado(idPremio)
            siguiente()
          }}
          bloqueado={girando}
        />

        {/* El confeti va acá dentro y no sobre la ventana: recortado por el
            `overflow-hidden` del lienzo, no se escapa del cuadro que se graba. */}
        <canvas
          ref={lienzo}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        />
      </div>

      <AyudaAtajos abierta={ayudaAbierta} onCerrar={() => setAyudaAbierta(false)} />
    </div>
  )
}

/* ────────────────────────────── Piezas ────────────────────────────── */

/**
 * Un cañón de confeti, atado a un lienzo.
 *
 * `canvas-confetti` dibuja por defecto sobre un canvas fijo del tamaño de la
 * VENTANA, y sus orígenes son fracciones de ese canvas: `x: 0` es el borde
 * izquierdo de la pantalla. En el encuadre 9:16 eso deja los dos cañones fuera
 * del cuadro que se graba. Atado al lienzo, `x: 0` es el borde del encuadre —y
 * como el lienzo tiene `overflow-hidden`, el confeti además queda recortado
 * exactamente donde termina el video.
 */
export type Canon = (...opciones: Parameters<typeof confetti>) => unknown

function lanzarConfeti(canon: Canon) {
  // Dos cañones desde los costados más lluvia continua. No una explosión central:
  // esa tapa al ganador, que es lo único que hay que poder leer en el video.
  const fin = Date.now() + 3800
  const disparar = () => {
    void canon({
      particleCount: 7,
      angle: 58,
      spread: 72,
      origin: { x: 0, y: 0.75 },
      colors: COLORES,
      scalar: 1.1,
    })
    void canon({
      particleCount: 7,
      angle: 122,
      spread: 72,
      origin: { x: 1, y: 0.75 },
      colors: COLORES,
      scalar: 1.1,
    })
    if (Date.now() < fin) requestAnimationFrame(disparar)
  }
  disparar()
  void canon({
    particleCount: 140,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.4 },
    colors: COLORES,
  })
}

function prefijoDe(numero: string | null | undefined): string {
  if (!numero) return ''
  const partes = numero.split('-')
  return partes.length === 3 ? `${partes[0]}-${partes[1]}-` : ''
}

function Escenario({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-dvh w-screen place-items-center bg-ink-950 px-6">
      <div className="flex flex-col items-center gap-4 text-center">{children}</div>
    </div>
  )
}

function Mensaje({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <>
      <h1 className="text-xl font-semibold text-white">{titulo}</h1>
      {detalle ? <p className="max-w-md text-sm text-white/55">{detalle}</p> : null}
    </>
  )
}

function Volver({ id }: { id: string | undefined }) {
  return (
    <Link
      to={id ? `/sorteos/${id}` : '/sorteos'}
      className="text-sm font-medium text-brand-300 underline underline-offset-4 hover:text-brand-200"
    >
      Volver al panel
    </Link>
  )
}

function Cabecera({
  sorteo,
  marcas,
  oculta,
  id,
}: {
  sorteo: string
  marcas: string
  oculta: boolean
  id: string | undefined
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-start justify-between gap-4 px-[4cqw] pt-[3cqh] transition-opacity duration-300',
        oculta && 'pointer-events-none opacity-0',
      )}
    >
      <div className="flex items-center gap-[2cqw]">
        <img src="/eh.png" alt="" className="h-[7cqh] w-auto object-contain" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-[min(1.5rem,3cqw)] leading-tight font-semibold tracking-tight text-white text-balance">
            {sorteo}
          </h1>
          {marcas ? <p className="text-[min(0.95rem,2cqw)] text-white/45">{marcas}</p> : null}
        </div>
      </div>
      <Link
        to={id ? `/sorteos/${id}` : '/sorteos'}
        className="mt-1 inline-flex shrink-0 items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Panel
      </Link>
    </header>
  )
}

function Bolillero({
  facturas,
  cupones,
  clientes,
  listo,
}: {
  facturas: number
  cupones: number
  clientes: number
  listo: boolean
}) {
  if (!listo) {
    return (
      <p className="flex items-center gap-2 text-[min(1rem,2.2cqw)] text-white/40">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Preparando el bolillero…
      </p>
    )
  }

  // Con cupones, el número sobre el que se sortea son los cupones y no las
  // facturas: decir «283 facturas» mientras el sorteo corre sobre 2.764 chances
  // sería contar mal delante de cámara. Las facturas igual se muestran, porque
  // son las que se pueden contar y auditar.
  const conCupones = cupones > facturas

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-[3cqw] gap-y-2 text-[min(1.15rem,2.4cqw)] text-white/55">
      {conCupones ? (
        <span className="inline-flex items-center gap-2">
          <Ticket className="size-[1.1em] text-white/25" aria-hidden />
          <strong className="font-semibold text-white tabular-nums">{formatNumber(cupones)}</strong>
          cupones en el bolillero
        </span>
      ) : null}
      <span className="inline-flex items-center gap-2">
        {conCupones ? null : <Ticket className="size-[1.1em] text-white/25" aria-hidden />}
        <strong className="font-semibold text-white tabular-nums">{formatNumber(facturas)}</strong>
        facturas{conCupones ? '' : ' en el bolillero'}
      </span>
      <span className="inline-flex items-center gap-2">
        <Users className="size-[1.1em] text-white/25" aria-hidden />
        <strong className="font-semibold text-white tabular-nums">{formatNumber(clientes)}</strong>
        clientes distintos
      </span>
    </p>
  )
}

function TarjetaGanador({ acta, enmascarar }: { acta: SorteoResultado; enmascarar: boolean }) {
  const nombre = enmascarar ? enmascararNombre(acta.receptor_nombre) : acta.receptor_nombre

  return (
    <div className="animate-ganador-entra flex flex-col items-center gap-[1cqh] text-center">
      <Trophy className="size-[min(2.5rem,5cqw)] text-halcon" aria-hidden />
      <p className="text-[min(3rem,5.5cqw)] leading-tight font-semibold tracking-tight text-white text-balance">
        {nombre ?? 'Sin nombre'}
      </p>
      {/* Nunca el RUC, ni enmascarado. El número de factura alcanza para que el
          ganador se reconozca, y es lo que se puede mostrar en un video. */}
      <p className="text-[min(1.1rem,2.3cqw)] text-white/45 tabular-nums">
        Factura {acta.factura_numero}
      </p>
    </div>
  )
}

function BotonPrincipal({
  revelado,
  terminado,
  habilitado,
  onClick,
}: {
  revelado: boolean
  terminado: boolean
  habilitado: boolean
  onClick: () => void
}) {
  // Con el último premio revelado el botón no desaparece: cambia de destino. Es
  // el único camino al podio —el cierre del video— y sin él la pantalla se queda
  // clavada en el último ganador.
  const cierra = revelado && terminado

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!habilitado}
      className={cn(
        'inline-flex items-center gap-3 rounded-full px-[3cqw] py-[2cqh]',
        'text-[min(1.4rem,2.8cqw)] font-semibold transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-halcon',
        habilitado
          ? 'bg-halcon text-ink-950 hover:scale-[1.03] hover:bg-halcon/90'
          : 'cursor-not-allowed bg-white/10 text-white/30',
      )}
    >
      {cierra ? (
        <>
          <Trophy className="size-[1.1em]" aria-hidden />
          Ver ganadores
        </>
      ) : revelado ? (
        <>
          <Play className="size-[1.1em]" aria-hidden />
          Siguiente premio
        </>
      ) : (
        <>
          <Trophy className="size-[1.1em]" aria-hidden />
          Sortear
        </>
      )}
      <kbd className="rounded bg-black/15 px-2 py-0.5 text-[0.55em] font-medium tracking-wide">
        Espacio
      </kbd>
    </button>
  )
}

function Controles({
  oculta,
  formato,
  onFormato,
  pantallaCompleta,
  onPantallaCompleta,
  conSonido,
  onSonido,
  onAyuda,
  movimientoReducido,
  animar,
  onAnimar,
  premios,
  onPremio,
  bloqueado,
}: {
  oculta: boolean
  formato: Formato
  onFormato: (f: Formato) => void
  pantallaCompleta: boolean
  onPantallaCompleta: () => void
  conSonido: boolean
  onSonido: () => void
  onAyuda: () => void
  movimientoReducido: boolean
  animar: boolean
  onAnimar: () => void
  premios: { id: number; nombre: string; ganada: boolean; elegido: boolean }[]
  onPremio: (id: number) => void
  bloqueado: boolean
}) {
  return (
    <footer
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-3 px-[4cqw] pb-[3cqh] transition-opacity duration-300',
        oculta && 'pointer-events-none opacity-0',
      )}
    >
      {/* Los premios, como escalera. Es el acta en vivo y el selector a la vez. */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {premios.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={p.ganada || bloqueado}
              onClick={() => onPremio(p.id)}
              title={p.nombre}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                p.ganada
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : p.elegido
                    ? 'bg-halcon/20 text-halcon ring-1 ring-halcon/40 ring-inset'
                    : 'text-white/40 hover:bg-white/10 hover:text-white/80',
              )}
            >
              <span className="tabular-nums">{i + 1}</span>
              <span className="max-w-32 truncate">{p.nombre}</span>
              {p.ganada ? <Trophy className="size-3" aria-hidden /> : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-1">
        <div className="mr-1 flex rounded-full bg-white/5 p-0.5">
          {(['libre', '16:9', '9:16'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormato(f)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                formato === f ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70',
              )}
            >
              {f === 'libre' ? 'Libre' : f}
            </button>
          ))}
        </div>
        <BotonIcono onClick={onSonido} titulo={conSonido ? 'Silenciar (M)' : 'Con sonido (M)'}>
          {conSonido ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </BotonIcono>
        <BotonIcono
          onClick={onPantallaCompleta}
          titulo={pantallaCompleta ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
        >
          {pantallaCompleta ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </BotonIcono>
        {/* Sólo para quien tiene la preferencia de movimiento reducido activa: a
            los demás no les falta nada y el control sería ruido. */}
        {movimientoReducido ? (
          <BotonIcono
            onClick={onAnimar}
            titulo={animar ? 'Volver a la animación mínima' : 'Animar igual'}
          >
            {animar ? <Sparkles className="size-4" /> : <Sparkle className="size-4" />}
          </BotonIcono>
        ) : null}
        <BotonIcono onClick={onAyuda} titulo="Atajos (?)">
          <Keyboard className="size-4" />
        </BotonIcono>
      </div>
    </footer>
  )
}

function BotonIcono({
  onClick,
  titulo,
  children,
}: {
  onClick: () => void
  titulo: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
    >
      {children}
    </button>
  )
}
