/**
 * El sonido del sorteo, sintetizado con Web Audio.
 *
 * ── Por qué sintetizado y no archivos ──────────────────────────────────────
 * Tres razones, en orden de peso:
 *
 *   1. Licencias. Un tick de ruleta y una fanfarria bajados de internet son una
 *      deuda legal escondida en un repo, justo en un video que se sube a redes.
 *      Lo que se genera con osciladores no es de nadie.
 *   2. Peso. Son unas líneas de código contra cientos de KB de audio en el
 *      bundle de una pantalla que casi nunca se abre.
 *   3. Precisión. El tick tiene que sonar EXACTAMENTE cuando el dígito traba.
 *      Con `AudioContext.currentTime` eso se agenda al milisegundo; con un
 *      `<audio>` se depende de cuándo el navegador decida decodificar.
 *
 * ── Silenciado por defecto ─────────────────────────────────────────────────
 * Y no es sólo cortesía: los navegadores bloquean el audio hasta que hay un
 * gesto del usuario. Arrancar en silencio y encender con la tecla `M` convierte
 * esa restricción en el comportamiento correcto en vez de en un bug.
 */

let contexto: AudioContext | null = null

/** El contexto se crea al primer sonido: antes de un gesto, el navegador lo suspende. */
function obtenerContexto(): AudioContext | null {
  try {
    contexto ??= new AudioContext()
    if (contexto.state === 'suspended') void contexto.resume()
    return contexto
  } catch {
    // Un navegador sin Web Audio no rompe el sorteo: se sortea en silencio.
    return null
  }
}

interface Nota {
  frecuencia: number
  /** Segundos desde ahora. */
  en?: number
  duracion?: number
  volumen?: number
  tipo?: OscillatorType
}

function tocar({ frecuencia, en = 0, duracion = 0.08, volumen = 0.2, tipo = 'sine' }: Nota): void {
  const ctx = obtenerContexto()
  if (!ctx) return

  const inicio = ctx.currentTime + en
  const oscilador = ctx.createOscillator()
  const ganancia = ctx.createGain()

  oscilador.type = tipo
  oscilador.frequency.setValueAtTime(frecuencia, inicio)

  // Envolvente corta con caída exponencial. Un corte seco produce un chasquido
  // audible —el salto de amplitud es un impulso— y en una grabación se nota.
  ganancia.gain.setValueAtTime(0.0001, inicio)
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.008)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)

  oscilador.connect(ganancia).connect(ctx.destination)
  oscilador.start(inicio)
  oscilador.stop(inicio + duracion + 0.02)
}

/** El clic de la ruleta girando. Se llama muchas veces por segundo. */
export function tick(): void {
  tocar({ frecuencia: 1400, duracion: 0.03, volumen: 0.05, tipo: 'square' })
}

/** El golpe de un dígito que traba. Más grave cuanto más a la derecha. */
export function trabe(indice: number, total: number): void {
  const grave = 320 + (indice / Math.max(total - 1, 1)) * 260
  tocar({ frecuencia: grave, duracion: 0.12, volumen: 0.16, tipo: 'triangle' })
}

/** El redoble del suspenso: un zumbido que sube mientras no hay resultado. */
export function suspenso(): void {
  const ctx = obtenerContexto()
  if (!ctx) return
  const inicio = ctx.currentTime
  const oscilador = ctx.createOscillator()
  const ganancia = ctx.createGain()
  oscilador.type = 'sawtooth'
  oscilador.frequency.setValueAtTime(70, inicio)
  oscilador.frequency.exponentialRampToValueAtTime(160, inicio + 1.1)
  ganancia.gain.setValueAtTime(0.0001, inicio)
  ganancia.gain.exponentialRampToValueAtTime(0.07, inicio + 0.3)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + 1.2)
  oscilador.connect(ganancia).connect(ctx.destination)
  oscilador.start(inicio)
  oscilador.stop(inicio + 1.3)
}

/** La fanfarria del ganador: un arpegio mayor ascendente. */
export function fanfarria(): void {
  // Do–Mi–Sol–Do: la tríada mayor. Suena a premio en cualquier cultura que haya
  // escuchado una radio.
  const notas = [523.25, 659.25, 783.99, 1046.5]
  notas.forEach((frecuencia, i) => {
    tocar({ frecuencia, en: i * 0.11, duracion: i === 3 ? 0.6 : 0.16, volumen: 0.22, tipo: 'triangle' })
  })
}
