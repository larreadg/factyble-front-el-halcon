import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import type { Canon } from '@/features/sorteos/PresentarSorteoPage'
import { enmascararNombre } from '@/features/sorteos/mascara'
import { cn } from '@/lib/cn'
import type { SorteoResultado } from '@/types/database'

/**
 * La pantalla final: todos los ganadores juntos.
 *
 * ── Para qué existe ────────────────────────────────────────────────────────
 * Es el cierre del video. Un sorteo que termina volviendo al panel deja la
 * grabación sin final; esto le da el plano con el que se corta: los ganadores en
 * escalera, el logo, y un QR que lleva a la constancia pública para que quien
 * mire desde el celular la abra sin tipear nada.
 *
 * ── El orden es el del sorteo, no un podio deportivo ───────────────────────
 * El primer premio arriba porque salió primero y porque suele ser el mayor. No
 * se reordena por valor: el orden en que se sortearon es el que la gente vio.
 */

export function PodioFinal({
  actas,
  enmascarar,
  slug,
  nombre,
  canon,
  animar,
}: {
  actas: SorteoResultado[]
  enmascarar: boolean
  slug: string | null
  nombre: string
  /** El mismo cañón de la escena: dispara dentro del encuadre, no de la ventana. */
  canon: Canon
  /** `false` con movimiento reducido: el podio entra sin lluvia final. */
  animar: boolean
}) {
  const url = slug ? `${window.location.origin}/sorteo/resultado/${slug}` : null
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    // Se genera en el cliente y queda como data URI: no hay servicio externo de
    // por medio, así que el QR funciona igual sin internet en la sala.
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: '#00303f', light: '#ffffff' },
    }).then(setQr, () => setQr(null))
  }, [url])

  // Una última lluvia al llegar al cierre. Va acá y no en el padre porque este
  // componente se monta exactamente una vez, cuando ya no queda nada por sortear.
  useEffect(() => {
    if (!animar) return
    const fin = Date.now() + 2600
    const disparar = () => {
      void canon({
        particleCount: 4,
        angle: 90,
        spread: 120,
        startVelocity: 28,
        origin: { x: Math.random(), y: -0.1 },
        colors: ['#fdad01', '#3bd1f9', '#1872f9', '#ffffff'],
      })
      if (Date.now() < fin) requestAnimationFrame(disparar)
    }
    disparar()
  }, [canon, animar])

  return (
    <div className="animate-podio-entra flex w-full max-w-[min(70rem,92cqw)] flex-col items-center gap-[3cqh]">
      <div className="flex flex-col items-center gap-1">
        <Trophy className="size-[min(2.6rem,5cqw)] text-halcon" aria-hidden />
        <h2 className="text-[min(2.4rem,4.6cqw)] leading-tight font-semibold tracking-tight text-white text-balance">
          Ganadores
        </h2>
        <p className="text-[min(1rem,2.1cqw)] text-white/40">{nombre}</p>
      </div>

      <ol className="flex w-full flex-col gap-[1.2cqh]">
        {actas.map((acta, indice) => {
          const ganador = enmascarar ? enmascararNombre(acta.receptor_nombre) : acta.receptor_nombre
          // El primero se destaca: es el premio mayor y el que la gente espera.
          const principal = indice === 0

          return (
            <li
              key={acta.id}
              className={cn(
                'flex items-center gap-[2cqw] rounded-2xl px-[2.5cqw] py-[1.8cqh] ring-1 ring-inset',
                principal ? 'bg-halcon/12 ring-halcon/30' : 'bg-white/[0.04] ring-white/10',
              )}
            >
              <span
                className={cn(
                  'grid size-[min(3rem,6cqw)] shrink-0 place-items-center rounded-full text-[min(1.3rem,2.6cqw)] font-semibold tabular-nums',
                  principal ? 'bg-halcon text-ink-950' : 'bg-white/10 text-white/60',
                )}
              >
                {acta.premio_orden}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate font-semibold tracking-tight text-white',
                    principal ? 'text-[min(1.9rem,3.6cqw)]' : 'text-[min(1.4rem,2.8cqw)]',
                  )}
                >
                  {ganador ?? 'Sin nombre'}
                </p>
                <p className="truncate text-[min(0.95rem,2cqw)] text-white/40">
                  {acta.premio_nombre}
                </p>
              </div>
              <p className="shrink-0 text-[min(1rem,2.1cqw)] text-white/35 tabular-nums">
                {acta.factura_numero}
              </p>
            </li>
          )
        })}
      </ol>

      {qr && url ? (
        <div className="flex items-center gap-[2cqw]">
          <img
            src={qr}
            alt=""
            aria-hidden
            className="size-[min(7rem,13cqw)] rounded-xl bg-white p-[0.6cqh]"
          />
          <div className="min-w-0">
            <p className="text-[min(1rem,2.1cqw)] font-medium text-white/80">
              Mirá los resultados completos
            </p>
            {/* La URL en texto además del QR: en una historia de Instagram nadie
                puede escanear la pantalla de su propio celular. */}
            <p className="mt-0.5 text-[min(0.85rem,1.8cqw)] break-all text-white/35">
              {url.replace(/^https?:\/\//, '')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
