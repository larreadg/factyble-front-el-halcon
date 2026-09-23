import { Banknote, FileText, Percent, Users, type LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber, pluralize, toNumber } from '@/lib/format'
import type { DashboardResumen } from '@/types/database'

interface ResumenMetricasProps {
  data: DashboardResumen | null | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * Los dos tintes de la identidad, repartidos por PREGUNTA y no por posición:
 * `accent` —el azul del punto del isotipo— para la plata, `brand` —el celeste
 * de la "F"— para el volumen de actividad. Es la misma regla que ya siguen los
 * rankings del dashboard, y por eso la fila alterna: el par se lee junto aunque
 * las dos cards no queden pegadas.
 *
 * El ámbar de El Halcón queda deliberadamente afuera: es co-branding, no un
 * color de dato. Ver el comentario del token en `index.css`.
 */
const TINTES = {
  dinero: 'bg-accent-50 text-accent-700 ring-accent-100',
  actividad: 'bg-brand-50 text-brand-700 ring-brand-100',
} as const

interface Metrica {
  id: string
  label: string
  valor: string
  /** Segunda lectura de la misma métrica. Opcional: no todas tienen una. */
  pie?: string
  Icono: LucideIcon
  tinte: keyof typeof TINTES
}

/**
 * Una fila por card en mobile, dos en tablet, las cuatro recién en `xl`.
 *
 * Las cuatro columnas entran en `lg` (1024px) sólo sobre el papel: descontando
 * el sidebar (`w-60`) y el padding del `<main>`, a esa altura cada card mide
 * ~172px útiles y un monto en guaraníes necesita 215px a `text-2xl`. Se partía
 * en dos y hasta tres líneas justo en las resoluciones de laptop más comunes.
 */
const GRILLA = 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4'

/**
 * El valor sigue al ancho de la CARD, no al del viewport: `xl` es donde entran
 * las cuatro columnas y cada una se angosta, así que ahí el número baja un
 * escalón y vuelve a subir en `2xl`, cuando otra vez hay lugar. Escalones fijos
 * de la escala, no `clamp()`: en UI de producto el tamaño del dato no debería
 * cambiar con cada píxel de la ventana.
 */
const VALOR = 'text-2xl xl:text-xl 2xl:text-2xl'

export function ResumenMetricas({ data, isPending, isError, onRetry }: ResumenMetricasProps) {
  if (isPending) {
    return (
      <div className={GRILLA}>
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-36" />
            <Skeleton className="mt-2.5 h-3 w-24" />
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <ErrorState
          title="No pudimos cargar el resumen"
          description="Los totales del período no llegaron desde el servidor."
          onRetry={onRetry}
        />
      </Card>
    )
  }

  const canceladas = toNumber(data?.canceladas)
  const exentas = toNumber(data?.total_exentas)

  // El split se calcula sobre contado + crédito y no sobre el total: son las dos
  // únicas condiciones de venta, pero redondear cada una por separado contra el
  // total deja sumas de 99% o 101%. Derivar la segunda de la primera no.
  const contado = toNumber(data?.total_contado)
  const credito = toNumber(data?.total_credito)
  const baseCondicion = contado + credito
  const pctContado = baseCondicion > 0 ? Math.round((contado / baseCondicion) * 100) : null

  const metricas: Metrica[] = [
    {
      id: 'total',
      label: 'Total facturado',
      valor: formatCurrency(data?.total),
      pie:
        pctContado === null ? undefined : `Contado ${pctContado}% · Crédito ${100 - pctContado}%`,
      Icono: Banknote,
      tinte: 'dinero',
    },
    {
      id: 'cantidad',
      label: 'Facturas emitidas',
      valor: formatNumber(data?.cantidad),
      // Decir cuántas quedaron afuera explica el número mejor que repetir el
      // criterio: si no hay canceladas, no hay nada que aclarar.
      pie:
        canceladas > 0
          ? `${formatNumber(canceladas)} ${pluralize(canceladas, 'cancelada', 'canceladas')} fuera del total`
          : 'Sin canceladas en el período',
      Icono: FileText,
      tinte: 'actividad',
    },
    {
      id: 'iva',
      label: 'IVA total',
      valor: formatCurrency(data?.total_iva),
      pie: exentas > 0 ? `Ventas exentas ${formatCurrency(exentas)}` : undefined,
      Icono: Percent,
      tinte: 'dinero',
    },
    {
      id: 'clientes',
      label: 'Clientes distintos',
      valor: formatNumber(data?.clientes_distintos),
      Icono: Users,
      tinte: 'actividad',
    },
  ]

  return (
    <div className={GRILLA}>
      {metricas.map((metrica) => (
        <TarjetaMetrica key={metrica.id} metrica={metrica} />
      ))}
    </div>
  )
}

function TarjetaMetrica({ metrica }: { metrica: Metrica }) {
  const { label, valor, pie, Icono, tinte } = metrica

  return (
    // Sin hover ni transición: la card no lleva a ningún lado, y reaccionar al
    // puntero prometería un clic que no existe.
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
            TINTES[tinte],
          )}
          aria-hidden
        >
          <Icono className="size-[1.125rem]" />
        </span>
      </div>

      <p
        className={cn(
          'mt-2.5 leading-tight font-semibold break-words text-slate-900 tabular-nums',
          VALOR,
        )}
        title={valor}
      >
        {valor}
      </p>

      {pie ? <p className="mt-1.5 text-xs text-slate-500 tabular-nums">{pie}</p> : null}
    </Card>
  )
}
