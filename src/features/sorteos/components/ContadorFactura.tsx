import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { trabe, tick as tickSonoro } from '@/features/sorteos/sonido'

/**
 * El contador que revela el número de factura ganador.
 *
 * ── Por qué un número y no una ruleta de nombres ───────────────────────────
 * La unidad de participación es la FACTURA, no la persona, así que lo que se
 * sortea es un número. Y eso resuelve de paso el problema que hace fea a toda
 * ruleta de nombres: con 283 participantes los gajos quedan de un grado y no se
 * distingue nada en una grabación. Acá hay siete dígitos, se lean 283 facturas o
 * 90.000, y quien mira puede seguir el número mientras traba.
 *
 * Es además lo más discreto: durante el sorteo no aparece ningún nombre en
 * pantalla, y esta pantalla se sube a redes.
 *
 * ── La coreografía ─────────────────────────────────────────────────────────
 *   1. SUSPENSO (~1 s): los dígitos ya giran, borrosos, y el premio pulsa.
 *   2. GIRO: siguen girando hasta que el servidor contesta. Si tarda, giran más:
 *      la animación nunca adelanta un resultado que no llegó.
 *   3. TRABADO: se detienen de izquierda a derecha, cada uno con un rebote y un
 *      destello. El intervalo CRECE hacia el final — los dos últimos tardan el
 *      doble — porque es ahí donde está la tensión.
 *
 * El blur no es decorativo: un dígito que cambia 16 veces por segundo sin blur
 * se lee como parpadeo, y con blur se lee como movimiento. Es la diferencia
 * entre que parezca roto y que parezca una ruleta.
 */

/** Cada cuánto cambia un dígito que todavía gira. */
const MS_TICK = 55

interface ContadorFacturaProps {
  /**
   * El número completo, `001-001-0000548`. `null` mientras no hay resultado: los
   * dígitos giran sin destino.
   */
  numero: string | null
  /** El prefijo a mostrar antes de que haya número: lo comparten todas las facturas. */
  prefijoPorDefecto?: string
  girando: boolean
  /** Cuánto dura el suspenso antes de que empiece a trabar el primer dígito. */
  msSuspenso?: number
  /** Cuánto tarda entre un dígito y el siguiente, sin contar el tramo final. */
  msEntreDigitos?: number
  conSonido?: boolean
  /**
   * `false` con movimiento reducido: el número aparece de una, sin girar. Lo
   * decide el padre y no este componente, porque la preferencia del sistema se
   * puede anular desde los controles de la presentación.
   */
  animar?: boolean
  /** Se llama cuando trabó el último dígito: es el pie para el confeti. */
  onTermino?: () => void
}

/**
 * ⚠️ El padre monta este componente con una `key` distinta por cada giro, y de
 * eso depende que arranque limpio. Sin la `key` haría falta un efecto que
 * reponga el estado al empezar — sincronizar estado con estado, que es lo que
 * React pide no hacer. Remontar es la forma barata de decir "esto empieza de
 * nuevo".
 */
export function ContadorFactura({
  numero,
  prefijoPorDefecto,
  girando,
  msSuspenso = 2600,
  msEntreDigitos = 340,
  conSonido = false,
  animar = true,
  onTermino,
}: ContadorFacturaProps) {
  const { prefijo: prefijoDelNumero, serie } = useMemo(() => separar(numero), [numero])
  const prefijo = prefijoDelNumero || (prefijoPorDefecto ?? '')

  const total = serie.length || 7
  const [trabados, setTrabados] = useState(0)
  const [ruido, setRuido] = useState(0)

  const alTerminar = useRef(onTermino)
  const sonando = useRef(conSonido)
  useEffect(() => {
    alTerminar.current = onTermino
    sonando.current = conSonido
  })

  // Un solo intervalo para los siete dígitos: son siete elementos, no hace falta
  // uno por dígito. El tick sonoro va acá para que suene sincronizado con lo que
  // se ve, no con un temporizador aparte.
  useEffect(() => {
    if (!girando) return
    const reloj = setInterval(() => {
      setRuido((n) => n + 1)
      if (sonando.current) tickSonoro()
    }, MS_TICK)
    return () => {
      clearInterval(reloj)
    }
  }, [girando])

  // La cascada de trabado. Sin animación los retardos son CERO en vez de haber
  // una rama aparte: el número aparece de una, la información es la misma y lo
  // único que se pierde es el espectáculo.
  useEffect(() => {
    if (!girando || !numero) return

    const espera = animar ? msSuspenso : 0
    const relojes: number[] = []

    for (let i = 0; i < total; i++) {
      const retardo = animar ? retardoDe(i, total, msEntreDigitos) : 0
      relojes.push(
        window.setTimeout(() => {
          setTrabados(i + 1)
          if (sonando.current) trabe(i, total)
          if (i === total - 1) alTerminar.current?.()
        }, espera + retardo),
      )
    }

    return () => {
      for (const reloj of relojes) window.clearTimeout(reloj)
    }
  }, [girando, numero, total, animar, msSuspenso, msEntreDigitos])

  const digitos = serie.length > 0 ? serie.split('') : Array.from({ length: 7 }, () => '0')
  const completo = trabados === total && numero !== null

  return (
    <div
      className="flex items-center justify-center gap-[min(0.75rem,1.6cqw)]"
      // Se anuncia el número ya trabado, no cada tick: un lector de pantalla
      // leyendo siete dígitos a 18 por segundo es ruido, no información.
      role="status"
      aria-live="polite"
      aria-label={completo ? `Factura ganadora ${numero}` : 'Sorteando…'}
    >
      {/* `whitespace-nowrap` porque si no se parte en «001-» y «001-» y descoloca
          todo. Y sólo desde 48rem DE LIENZO —no de ventana, por eso `@[48rem]:`
          y no `lg:`—: abajo de eso esos ocho caracteres se comen el ancho de dos
          dígitos sin aportar nada, y en el encuadre 9:16 el lienzo es angosto
          aunque la ventana sea enorme. El prefijo es idéntico en TODAS las
          facturas; lo que se sortea son los siete de la derecha. */}
      {prefijo ? (
        <span
          className="hidden text-[min(3rem,4cqw)] font-semibold tracking-tight whitespace-nowrap text-white/25 tabular-nums @[48rem]:inline"
          aria-hidden
        >
          {prefijo}
        </span>
      ) : null}

      {/* El tamaño es fluido y no por breakpoints: son SIETE celdas de ancho fijo
          en fila, y cualquier ancho que entre en un breakpoint se pasa en el de
          abajo (medido: desbordaba en 320, 390 y 660 px). `min(5rem, 9.5cqw)`
          ocupa siempre la misma proporción y deja de crecer al llegar al tope,
          para que en un proyector no queden dígitos absurdos. */}
      <div className="flex gap-[min(0.375rem,1cqw)]" aria-hidden>
        {digitos.map((digito, indice) => {
          const trabado = indice < trabados
          // Mientras gira, el dígito es ruido determinista: cambia con el tick y
          // con la posición, así los siete no giran en sincronía.
          const visible = trabado ? digito : String((ruido * 7 + indice * 3) % 10)

          return (
            <span
              key={indice}
              className={cn(
                'grid place-items-center overflow-hidden rounded-xl font-semibold tabular-nums',
                'h-[min(9rem,17cqw)] w-[min(6rem,11cqw)] text-[min(4.5rem,8.5cqw)]',
                'ring-1 ring-inset transition-colors duration-300',
                trabado
                  ? 'bg-halcon/15 text-halcon ring-halcon/40'
                  : 'bg-white/[0.04] text-white/60 ring-white/10',
                // El resplandor sólo cuando el número está completo: encenderlo
                // dígito a dígito convertiría el clímax en un goteo.
                completo && 'animate-resplandor',
              )}
            >
              <span
                // `key` por dígito trabado: al cambiar, React reemplaza el nodo y
                // la animación de rebote vuelve a correr. Es lo que hace que cada
                // tarjeta "caiga" en vez de simplemente cambiar de color.
                key={trabado ? `t${String(indice)}` : `g${String(ruido)}`}
                className={cn(
                  'block',
                  trabado ? 'animate-digito-traba' : 'blur-[2px] brightness-90',
                )}
              >
                {visible}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** El intervalo crece al final: los dos últimos dígitos son el clímax. */
function retardoDe(indice: number, total: number, base: number): number {
  const desdeElFinal = total - 1 - indice
  return indice * base * (desdeElFinal <= 1 ? 2 : 1)
}

/**
 * Parte `001-001-0000548` en prefijo y serie.
 *
 * Si el número no tiene la forma esperada —otro punto de expedición, un formato
 * que cambie— gira el número entero en vez de romperse.
 */
function separar(numero: string | null): { prefijo: string; serie: string } {
  if (!numero) return { prefijo: '', serie: '' }
  const partes = numero.split('-')
  if (partes.length !== 3) return { prefijo: '', serie: numero.replace(/\D/g, '') }
  return { prefijo: `${partes[0]}-${partes[1]}-`, serie: partes[2] ?? '' }
}
