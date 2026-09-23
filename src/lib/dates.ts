/**
 * Todo lo relativo a fechas pasa por acá. La app razona siempre en días calendario
 * de Asunción, sin importar la zona horaria del navegador que la abre.
 */
import { TZDate } from '@date-fns/tz'
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'

export const TIMEZONE = 'America/Asuncion'

/** Fecha calendario `yyyy-MM-dd`, que es lo que esperan las RPC del dashboard. */
export type IsoDate = string

export interface DateRange {
  desde: IsoDate
  hasta: IsoDate
}

export type Granularidad = 'day' | 'week' | 'month'

export type RangePresetId = 'hoy' | 'ultimos7' | 'esteMes' | 'mesAnterior' | 'esteAnio' | 'custom'

export const RANGE_PRESETS: { id: RangePresetId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ultimos7', label: 'Últimos 7 días' },
  { id: 'esteMes', label: 'Este mes' },
  { id: 'mesAnterior', label: 'Mes anterior' },
  { id: 'esteAnio', label: 'Este año' },
  { id: 'custom', label: 'Personalizado' },
]

/** "Ahora" visto desde Asunción: sus getters devuelven componentes de esa zona. */
function nowInAsuncion(): TZDate {
  return new TZDate(new Date(), TIMEZONE)
}

function toIsoDate(date: TZDate): IsoDate {
  return format(date, 'yyyy-MM-dd')
}

/** Parte un `yyyy-MM-dd` en sus componentes, sin pasar por `Date` (evita desfasajes). */
function splitIsoDate(value: IsoDate): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

export function isIsoDate(value: string | null | undefined): value is IsoDate {
  if (!value) return false
  const parts = splitIsoDate(value)
  if (!parts) return false
  const date = TZDate.tz(TIMEZONE, parts.year, parts.month - 1, parts.day)
  // Rechaza fechas que el constructor "corrige" (31 de febrero, por ejemplo).
  return isValid(date) && date.getDate() === parts.day && date.getMonth() === parts.month - 1
}

/** El día calendario de hoy en Asunción. */
export function hoyEnAsuncion(): IsoDate {
  return toIsoDate(nowInAsuncion())
}

function startOfDayAsuncion(value: IsoDate): TZDate {
  const parts = splitIsoDate(value) ?? { year: 1970, month: 1, day: 1 }
  return TZDate.tz(TIMEZONE, parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)
}

function endOfDayAsuncion(value: IsoDate): TZDate {
  const parts = splitIsoDate(value) ?? { year: 1970, month: 1, day: 1 }
  return TZDate.tz(TIMEZONE, parts.year, parts.month - 1, parts.day, 23, 59, 59, 999)
}

/**
 * Convierte un rango de días de Asunción a los límites `timestamptz` que necesita
 * el filtro de `v_factura` (ambos extremos inclusive, como en las RPC).
 */
export function rangeToTimestamptz(range: DateRange): { desde: string; hasta: string } {
  return {
    desde: startOfDayAsuncion(range.desde).toISOString(),
    hasta: endOfDayAsuncion(range.hasta).toISOString(),
  }
}

export function resolvePreset(preset: Exclude<RangePresetId, 'custom'>): DateRange {
  const now = nowInAsuncion()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  const hoy = toIsoDate(now)

  switch (preset) {
    case 'hoy':
      return { desde: hoy, hasta: hoy }
    case 'ultimos7':
      return { desde: toIsoDate(TZDate.tz(TIMEZONE, year, month, day - 6)), hasta: hoy }
    case 'esteMes':
      return { desde: toIsoDate(TZDate.tz(TIMEZONE, year, month, 1)), hasta: hoy }
    case 'mesAnterior':
      return {
        desde: toIsoDate(TZDate.tz(TIMEZONE, year, month - 1, 1)),
        // Día 0 del mes actual = último día del mes anterior.
        hasta: toIsoDate(TZDate.tz(TIMEZONE, year, month, 0)),
      }
    case 'esteAnio':
      return { desde: toIsoDate(TZDate.tz(TIMEZONE, year, 0, 1)), hasta: hoy }
  }
}

/** Identifica si un rango coincide con alguno de los presets, para marcarlo activo. */
export function matchPreset(range: DateRange): RangePresetId {
  const candidatos: Exclude<RangePresetId, 'custom'>[] = [
    'hoy',
    'ultimos7',
    'esteMes',
    'mesAnterior',
    'esteAnio',
  ]
  for (const candidato of candidatos) {
    const resuelto = resolvePreset(candidato)
    if (resuelto.desde === range.desde && resuelto.hasta === range.hasta) return candidato
  }
  return 'custom'
}

export function diasEnRango(range: DateRange): number {
  return (
    differenceInCalendarDays(startOfDayAsuncion(range.hasta), startOfDayAsuncion(range.desde)) + 1
  )
}

/** ≤ 31 días → día, ≤ 120 → semana, más → mes. */
export function granularidadPara(range: DateRange): Granularidad {
  const dias = diasEnRango(range)
  if (dias <= 31) return 'day'
  if (dias <= 120) return 'week'
  return 'month'
}

function parseToAsuncion(value: string | null | undefined): TZDate | null {
  if (!value) return null
  const parsed = parseISO(value)
  if (!isValid(parsed)) return null
  return new TZDate(parsed, TIMEZONE)
}

/** `dd/MM/yyyy` en hora de Asunción. */
export function formatDate(value: string | null | undefined): string {
  const date = parseToAsuncion(value)
  return date ? format(date, 'dd/MM/yyyy', { locale: es }) : '—'
}

/** `dd/MM/yyyy HH:mm` en hora de Asunción. */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseToAsuncion(value)
  return date ? format(date, 'dd/MM/yyyy HH:mm', { locale: es }) : '—'
}

/** Etiqueta corta de un punto del gráfico, según la granularidad del rango. */
export function formatPeriodo(value: string, granularidad: Granularidad): string {
  const date = parseToAsuncion(value)
  if (!date) return value
  switch (granularidad) {
    case 'day':
      return format(date, 'dd/MM', { locale: es })
    case 'week':
      return format(date, "'sem.' dd/MM", { locale: es })
    case 'month':
      return format(date, 'MMM yy', { locale: es })
  }
}

/** Etiqueta larga para el tooltip del gráfico. */
export function formatPeriodoLargo(value: string, granularidad: Granularidad): string {
  const date = parseToAsuncion(value)
  if (!date) return value
  switch (granularidad) {
    case 'day':
      return format(date, "EEEE d 'de' MMMM yyyy", { locale: es })
    case 'week':
      return `Semana del ${format(date, "d 'de' MMMM yyyy", { locale: es })}`
    case 'month':
      return format(date, "MMMM 'de' yyyy", { locale: es })
  }
}

/** `hace 12 minutos` — para el indicador de sincronización. */
export function formatDistancia(value: string | null | undefined): string {
  const date = parseToAsuncion(value)
  if (!date) return '—'
  return `hace ${formatDistanceToNowStrict(date, { locale: es })}`
}

/** Minutos transcurridos desde un instante dado; `null` si la fecha no es válida. */
export function minutosDesde(value: string | null | undefined): number | null {
  const date = parseToAsuncion(value)
  if (!date) return null
  return (Date.now() - date.getTime()) / 60000
}

/** Rango legible: `01/09/2026 – 20/09/2026`. */
export function formatRango(range: DateRange): string {
  if (range.desde === range.hasta) return formatDate(startOfDayAsuncion(range.desde).toISOString())
  return `${formatDate(startOfDayAsuncion(range.desde).toISOString())} – ${formatDate(
    startOfDayAsuncion(range.hasta).toISOString(),
  )}`
}
