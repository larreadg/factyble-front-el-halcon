/**
 * Formateo centralizado para toda la app: Paraguay, español, guaraníes sin decimales.
 */

const LOCALE = 'es-PY'

/**
 * Los `numeric` de PostgreSQL llegan como string por PostgREST cuando exceden la
 * precisión segura de JS, y como number cuando no. Normalizamos siempre.
 */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'PYG',
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

/** Las cantidades de una línea pueden venir fraccionadas (2,5 kg / 0,75 m). */
const cantidadFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 })

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

/** `Gs. 1.234.567` */
export function formatCurrency(value: number | string | null | undefined): string {
  return currencyFormatter.format(toNumber(value))
}

/** `1.234.567` — sin símbolo, para celdas donde la moneda ya está en el encabezado. */
export function formatNumber(value: number | string | null | undefined): string {
  return decimalFormatter.format(toNumber(value))
}

/** `2,5` — cantidad de una línea de factura, sin ceros de relleno. */
export function formatCantidad(value: number | string | null | undefined): string {
  return cantidadFormatter.format(toNumber(value))
}

/** `Gs. 1,2 M` — para ejes y etiquetas de gráficos, donde no entra el número completo. */
export function formatCompactCurrency(value: number | string | null | undefined): string {
  return `Gs. ${compactFormatter.format(toNumber(value))}`
}

/** `1,2 M` — versión sin símbolo. */
export function formatCompactNumber(value: number | string | null | undefined): string {
  return compactFormatter.format(toNumber(value))
}

/** `1.234` facturas / `1` factura */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}
